.PHONY: all

all:
	@echo 'Please specify what you want to make explicitly'

slides.html: slides.md
	./generate_slides.py <$< >$@
