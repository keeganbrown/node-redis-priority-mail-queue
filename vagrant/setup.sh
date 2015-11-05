#!/bin/bash
sudo apt-get update
sudo apt-get upgrade -y

#INSTALL BASE
chmod +x "/vagrant/scripts/base.sh"
$include "/vagrant/scripts/base.sh"

#COMMENT OUT OR IN LINES AS APPROPRIATE
INCLUDED_TECH=()
INCLUDED_TECH+=("node")
INCLUDED_TECH+=("redis")
#INCLUDED_TECH+=("nginx")
INCLUDED_TECH+=("php")

SCRIPT_LOCATION="/vagrant/scripts/setup-"

for i in ${INCLUDED_TECH[@]}; do
	chmod +x "${SCRIPT_LOCATION}${i}.sh"
	$include "${SCRIPT_LOCATION}${i}.sh"
done

chmod +x "/vagrant/custom.sh"
$include "/vagrant/custom.sh"

echo "All Done!"
ls
