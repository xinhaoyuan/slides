#!/usr/bin/env python

# md_processor_command = 'python -m markdown'

import sys, os, subprocess
import markdown
import re

def main():
  # cur_process = subprocess.Popen(
  #   md_processor_command, 
  #   stdin = subprocess.PIPE, stdout = subprocess.PIPE, shell = True)
  slide_buffer = ''
  in_content = False
  options = {}
  for line in sys.stdin:
    if is_title_line(line):
      if in_content:
        write_slide(markdown.markdown(slide_buffer))
        # write_slide(cur_process.communicate(slide_buffer)[0])
        # cur_process = subprocess.Popen(
        #   md_processor_command, 
        #   stdin = subprocess.PIPE, stdout = subprocess.PIPE, shell = True)
        slide_buffer = ''
      else:
        # XXX write options
        sys.stdout.write('<div id="slides"')
        for i in options:
          if options[i].startswith('"'):
            sys.stdout.write(' %s=%s' % (i, options[i]))
          else:
            sys.stdout.write(' %s="%s"' % (i, options[i]))
        sys.stdout.write('>\n')
        in_content = True
    
    if in_content:
      slide_buffer += line
    else:
      m = re.match('\s*([a-zA-Z_-]+)\s*=(.*)', line)
      if m:
        options[m.group(1)] = m.group(2).strip()
      pass
  if in_content and len(slide_buffer) > 0:
    write_slide(markdown.markdown(slide_buffer))
    # write_slide(cur_process.communicate(slide_buffer)[0])
  sys.stdout.write('</div>\n')
    
def is_title_line(line):
    sline = line.strip()
    return (len(sline) > 2 and sline[0] == '#' and sline[1] != '#') or \
      (len(sline) == 1 and sline[0] == '#')

def write_slide(slide):
    sys.stdout.write('<div class="slide">')
    sys.stdout.write(slide)
    sys.stdout.write('</div>\n')  

if __name__ == '__main__':
  main()
