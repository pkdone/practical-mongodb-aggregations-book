# Practical MongoDB Aggregations book

__Author:__ Paul Done ([@TheDonester](https://twitter.com/TheDonester))

Main repository for the creation and assembly of content for the _Practical MongoDB Aggregations_ book

The published version of the book is available at: [www.practical-mongodb-aggregations.com](https://www.practical-mongodb-aggregations.com)

The book's content is written as a set of Markdown files which are then generated into a collection of static HTML/PNG/CSS/JS files ready to be served via a static website at [GitHub Pages](https://pages.github.com/).


## Configuring A Local Environment To Edit & Rebuild The Book

The book's construction and build process relies on a Markdown-based book-building tool written in Rust called [mdBook](https://rust-lang.github.io/mdBook/)

To install the Rust and mdBook required build tools on your local workstation:
 * Via this GitHub project, choose to fork this repo to your own GitHub copy
 * From a terminal/shell/command-line, clone your forked project to your local workstation, e.g.: `git clone https://github.com/myuserid/practical-mongodb-aggregations-book.git`
 * [Install Rust](https://www.rust-lang.org/tools/install) (which will also install other Rust related tools, including the required _cargo_ tool)
 * Via a terminal/shell/command-line, using Rust's _cargo_ tool, install _mdBook_: `cargo install mdbook`
 * Via a terminal/shell/command-line, from the local base folder of the local cloned repo, run the _mdBook_ command to rebuild the book and open it in a browser: `mdbook build --open`


## Publishing A New Version Of The Book

 * In the file `src/credits.md` increment the version number of the book
 * Via a terminal/shell/command-line, from the base folder of this GitHub repo:
   - Run the following script which will rebuild the latest version of the book, copy it to the `/docs` directory, and add analytics tracking to each generated book HTML page: `./stage_book_for_publish.sh`
   - Using the appropriate GitHub commands, in the _main_ branch: Add changes, Commit changes, Push to main in GitHub
 
&nbsp;(the published new version of the book is also accessible via: [pkdone.github.io/practical-mongodb-aggregations-book/](https://pkdone.github.io/practical-mongodb-aggregations-book))


## Guidelines For Authoring Book Content

For any changes or additions, the following principles must to be adhered to, for consistency across all the chapters in the book and for ease of consumption by readers:

 * For the examples chapters, follow the exact `.md` file markdown section header and code area structure used by every existing example chapter
 * For Mongo-Shell/JavaScript code samples in each examples chapter's _Sample Data Population_ and _Aggregation Pipeline(s)_ sections, adhere to the following rules (note, for Mongo Shell results, these rules do not need to be adhered too - just use the result text as-is, as outputted from the shell):
   - Don't start or end a stage on the same line as another stage
   - For every field in a stage, and stage in a pipeline, include a trailing comma even if it is currently the last item
   - Include an empty newline between every stage
   - Include a '//' comment with an explanation, on a newline, before every stage (remember this book is a teaching aid - even though you may not comment every stage for real-world pipelines, in this book, you must do so)
   - Use double (not single) quotes for string values to be consistent with the [JSON](https://en.wikipedia.org/wiki/JSON) specification
   - Always include double quotes around field names, even though quotes are often optional for object key names in JavaScript - why?
     - It is easier to export the pipeline text to another programming language, especially Python, where Python's dictionaries represent structured data in a similar manner as JavaScript/JSON does, but where Python mandates that key names are surrounded by quotes
     - It adheres to the [JSON](https://en.wikipedia.org/wiki/JSON) specification to use double quotes, rather than single quotes
   - Always terminate each Shell JavaScript example command with a semi-colon


## How To Add & Submit A New Chapter

To create and then submit a new chapter for review and acceptance:

 * Fork this GitHub repo into your own version of the repo, and then perform the rest of these steps using your forked version of the repo
 * Edit the file `src/SUMMARY.md` and add your new chapter reference metadata
 * Create a new Markdown `.md` file and place the file into the relevant sub-folder hanging off the `src` folder
 * If the chapter is a chapter showing an example in the 2nd half of the book, use the exact same format/structure as one of the existing chapter examples
 * Run the _mdBook_ command to re-build the book and open it in a browser to check it looks ok: `mdbook build --open`
 * Create and submit a GitHub pull request capturing your additions and the reason why you feel the new chapter would add value to the book


## Future Released Versions Of The Book

Future versions of the book may include the following topics, yet to be written (not an exclusive list):

 * Aggregations considerations when Sharding
 * When prototyping large data sets, use the trick of using $sample or $limit to speed up aggregation execution time when prototyping (but avoiding dangers of never testing without these)
 * In the Composability chapter, provide more detail and examples on factoring out complex boilerplate parts of a pipeline into separate JavaScript functions
 * New section in book for complex field value manipulations (focussing on strings and arrays manipulations)
 * Further example chapters at each of the 3 complexity levels
 * One big $set stage vs multiple $set stages - pros & cons


----

[![CC BY-NC-SA 3.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

This work is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 3.0 License][cc-by-nc-sa]

[![CC BY-NC-SA 3.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: https://creativecommons.org/licenses/by-nc-sa/3.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/3.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%203.0-lightgrey.svg

Copyright &copy; 2021 MongoDB, Inc.

