#!/bin/bash

review_file() {
  local file="$1"
  
  prompt=$(cat <<EOF
이 Pull Request 변경사항을 리뷰해줘. 각 코멘트는 새로운 줄에 "라인 X: 코멘트 내용" 형식으로 작성해 줘. X는 해당 라인 번호야.

### 리뷰 언어:
한국어

### 제목:
$PR_TITLE

### 내용:
$PR_DESCRIPTION

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
        /repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER/comments \
        -f body="$comment" \
        -f commit_id="$COMMIT_SHA" \
        -f path="$file" \
        -f line="$line_number"
    fi
  done
}

IFS=' ' read -ra CHANGED_FILES_ARRAY <<< "$CHANGED_FILES"
for file in "${CHANGED_FILES_ARRAY[@]}"; do
  review_file "$file"
done