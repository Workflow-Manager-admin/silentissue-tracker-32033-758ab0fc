#!/bin/bash
cd /home/kavia/workspace/code-generation/silentissue-tracker-32033-758ab0fc/ticket_frontend_workspace/ticket_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

