 #!/bin/bash
 
 OK=0
 FAIL=0

if [[ -z "${MEDIATOR_URL}" ]]; then
  echo "The env var MEDIATOR_URL be defined"
  exit -1
fi


 while true; do 
  rm -rf ~/.indy_client/
  ./node_modules/.bin/ts-node ./1365.ts -m $MEDIATOR_URL 2>&1 1>/dev/null
  if [ $? -ne 0 ]; then
    ((FAIL++))
  else 
    ((OK++))
  fi
  
  echo "Results: Total $((FAIL + OK)), OK = $OK, FAIL = $FAIL"
  
  sleep 3
  
done