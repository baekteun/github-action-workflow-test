#!/bin/bash

review_file() {
  local file="$1"
  local pr_title="$2"
  local pr_description="$3"
  
  prompt=$(cat <<EOF
이 Pull Request 변경사항을 리뷰해줘. 각 코멘트는 새로운 줄에 "라인 X: 코멘트 내용" 형식으로 작성해 줘. X는 해당 라인 번호야.

### 리뷰 언어:
한국어

### 제목:
$pr_title

### 내용:
$pr_description

### 변경된 파일:
$(cat "$file")
EOF
)

  review=$(curl -s http://127.0.0.1:11434/api/generate -d "{\"model\": \"$LLM_MODEL\", \"prompt\": \"$prompt\", \"stream\": false}" | jq -r '.response')
  
  echo "$review" | while IFS= read -r line; do
    if [[ $line =~ ^라인\ ([0-9]+):\ (.+) ]]; then
      line_number="${BASH_REMATCH[1]}"
      comment="${BASH_REMATCH[2]}"
      
      # GitHub API를 사용하여 특정 라인에 코멘트 추가
      gh api \
        --method POST \
        -H "Accept: application/vnd.github.v3+json" \
        /repos/$GITHUB_REPOSITORY/pulls/${{ github.event.pull_request.number }}/comments \
        -f body="$comment" \
        -f commit_id="${{ github.event.pull_request.head.sha }}" \
        -f path="$file" \
        -f line="$line_number"
    fi
  done
}
}

for file in ${{ steps.get-modified-files.outputs.all_changed_files }}; do
  pr_title="${{ github.event.pull_request.title }}"
  pr_description="${{ github.event.pull_request.body }}"
  review_file "$file" "$pr_title" "$pr_description"
done