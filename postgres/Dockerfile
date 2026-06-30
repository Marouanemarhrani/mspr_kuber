FROM postgres:16-alpine
COPY init/01-schema.sql /docker-entrypoint-initdb.d/
# No root password in image; use Secret at runtime
