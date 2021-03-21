#!/bin/sh -e
printf "\nBuilding book\n"
mdbook build
printf "Removing old staged area copy of book\n"
rm -rf ./docs/*
printf "Copying generated book content to staged area\n"
cp -a ./book/. ./docs/
printf "Completed staging book\n\n"
