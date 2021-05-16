#!/usr/bin/env python3
##
# Post-process mdbook generated HTML files to add Google Analytics tag
##
import glob
import re


# Constants
google_analytics_script_tag = """
        <!-- Global site tag (gtag.js) - Google Analytics -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-D0T2GQ8R19"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-D0T2GQ8R19');
        </script>
"""
analytics_html_target = '</head>'
analytics_html_snippet = google_analytics_script_tag + '    ' + analytics_html_target


####
# Main function finding each HTML file and sending it to have tag added
####
def main():
    print('Starting to post-process HTML files')
    filepaths = glob.glob('./docs/**/*.html', recursive=True)

    for filepath in filepaths:
      add_analytics_tag_to_html_file(filepath)

    print('Ending post-processing of HTML files')


####
# Add Google Analytics tag to HTML before </head> tag.
####
def add_analytics_tag_to_html_file(filepath):
  print(f' {filepath}')

  with open(filepath, 'r+') as f:
      text = f.read()
      text = re.sub(analytics_html_target, analytics_html_snippet, text)
      f.seek(0)
      f.write(text)
      f.truncate()


####
# Bootstrap
####
if __name__ == '__main__':
    main()
