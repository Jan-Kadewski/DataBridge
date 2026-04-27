# Database

Local PostgreSQL 16, schema `databridge`.

## First-time setup

Run as superuser in `postgres` database:

    CREATE ROLE databridge_app WITH LOGIN PASSWORD 'databridge_dev_pw';
    CREATE DATABASE databridge OWNER databridge_app ENCODING 'UTF8' TEMPLATE template0;

Then, connected to `databridge` as `databridge_app`:
     schema.sql
     seed.sql