#!/usr/bin/env python3
##
# Post-process mdbook generated HTML files to add Google Analytics tag and optionally cheatsheet
# pre style tag
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
large_pre_style_script_tag = """
        <style>
          pre {
            font-size: 22px;
          }

          pre > .buttons {
            visibility: hidden;
          }
        </style>
"""
end_head_html_target = '</head>'
analytics_html_snippet = google_analytics_script_tag + '    ' + end_head_html_target
large_pre_plus_analytics_html_snippet = (large_pre_style_script_tag + google_analytics_script_tag +
                                         '    ' + end_head_html_target)
start_title_html_target = '<title>'
select_distinct_prefix_html_snippet = start_title_html_target + 'SQL SELECT DISTINCT equivalent: '


####
# Main function finding each HTML file and sending it to have tag added
####
def main():
    print('Starting to post-process HTML files')
    filepaths = glob.glob('./docs/**/*.html', recursive=True)

    for filepath in filepaths:
        add_extra_heaad_tags_to_html_file(filepath)
        add_extra_select_distinct_text_to_html_file(filepath)

    print('Ending post-processing of HTML files')


####
# Add Google Analytics tag + plus optional cheatsheet pre style tag to HTML before </head> tag.
####
def add_extra_heaad_tags_to_html_file(filepath):
    print(f' {filepath}')

    with open(filepath, 'r+') as f:
        text = f.read()
        replaceText = analytics_html_snippet

        if filepath.endswith("cheatsheet.html"):
            print("  CHEATSHEET - extra style tag added")
            replaceText = large_pre_plus_analytics_html_snippet

        text = re.sub(end_head_html_target, replaceText, text)
        f.seek(0)
        f.write(text)
        f.truncate()


####
# Add 'SQL SELECT DISTINCT equivalent:' prefix to title of "Distinct List Of Values" example title
# for SEO as commonly searched topic
####
def add_extra_select_distinct_text_to_html_file(filepath):
    print(f' {filepath}')

    with open(filepath, 'r+') as f:
        text = f.read()

        if filepath.endswith("distinct-values.html"):
            print("  DISTINCT LIST OF VALUES - added extra SELECT DISTINCT title prefix")
            text = re.sub(start_title_html_target, select_distinct_prefix_html_snippet, text)
            f.seek(0)
            f.write(text)
            f.truncate()


####
# Bootstrap
####
if __name__ == '__main__':
    main()
