#!/bin/bash
pip install --only-binary :all: -r requirements.txt 2>&1 || pip install -r requirements.txt
