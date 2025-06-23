#!/bin/bash
cd /home/kavia/workspace/code-generation/silentissue-tracker-32033-758ab0fc/ticket_backend_workspace/ticket_backend
source venv/bin/activate
flake8 .
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

