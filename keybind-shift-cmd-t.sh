#!/bin/bash

docker pull ghcr.io/wordpress-ssg/static-webpage:main
docker pull mariadb:10.5.12
docker pull ghcr.io/wordpress-ssg/dynamic-webpage:main
docker compose up --build
