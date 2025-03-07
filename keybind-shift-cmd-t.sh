#!/bin/bash

docker pull ghcr.io/wordpress-ssg/static-webpage:main
docker pull ghcr.io/wordpress-ssg/wrangler:main
docker pull mariadb:10.5.12
docker pull ghcr.io/wordpress-ssg/dynamic-webpage:main
# npx wrangler login
# npx wrangler pages deploy ./static/
docker compose up --build
