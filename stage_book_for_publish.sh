#!/bin/sh -e
printf "\nBuilding book\n"
mdbook build
printf "Removing old staged area copy of book\n"
rm -rf ./docs/*
printf "Copying generated book content to staged area\n"
cp -a ./book/. ./docs/
printf "Running post-processing to add Google Analytics tag and some other metadata to each HTML page\n"
./post-process-html.py
printf "Completed staging book\n\n"

