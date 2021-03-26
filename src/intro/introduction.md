# Introduction

## Who Is This Book For? 

This book is for developers, architects, data analysts and data scientists who have some familiarity with MongoDB, and who have already acquired at least a small amount of basic experience using the MongoDB Aggregation Framework. For those who don't yet have this 'entry level' knowledge, it is recommended to start with one or more of the following resources, before using this book:

 * The [MongoDB Manual](https://docs.mongodb.com/manual/), and specifically its [Aggregation](https://docs.mongodb.com/manual/aggregation/) section
 * The [MongoDB University](https://university.mongodb.com/) free online courses, and specifically [The MongoDB Aggregation Framework (M121)](https://university.mongodb.com/courses/M121/about) introduction course
 * The [MongoDB: The Definitive Guide](https://www.oreilly.com/library/view/mongodb-the-definitive/9781491954454/) book by Bradshaw, Brazil & Chodorow, and specifically its section _7. Introduction to the Aggregation Framework_

This is neither a book for complete novices, explaining how to get started on your first MongoDB aggregation pipeline, nor is it a comprehensive programming language guide, detailing every nuance of the Aggregation Framework and its syntax. Instead, this book is intended to assist with two key aspects:

 1. Providing a set of opinionated yet easy to digest principles and approaches for increasingly your effectiveness in using the Aggregation Framework
 2. Providing a set of examples for using the Aggregation Framework to solve common data manipulation challenges, with varying degrees of complexity


## What Is The Aggregation Framework?

MongoDB's aggregations language is somewhat of a paradox. It can appear daunting yet it is straight-forward. It can seem verbose yet it is lean and to the point. It is probably close to being [Turing complete](https://en.wikipedia.org/wiki/Turing_completeness) to be able to solve any business problem __*__, yet it is a strongly opinionated [Domain Specific Language (DSL)](https://en.wikipedia.org/wiki/Domain-specific_language), where, if you attempt to veer away from its core purpose of mass data manipulation, it will try its best to resist you.

> __*__ _As [John Page](http://ilearnasigoalong.blogspot.com/) once showed, you can even code a [Bitcoin miner](https://github.com/johnlpage/MongoAggMiner) using MongoDB aggregations, not that he would ever recommend you do this for real, for both the sake of your bank balance and the environment!_

Invariably, for beginners, the Aggregation Framework seems difficult to understand and comes with an initial steep learning curve which must be overcome to become productive. In some programming languages, only mastering the rudimentary elements of the language can result in being mostly productive in that language. With MongoDB aggregations, the level of initial investment required by an individual is usually a little greater. However, once mastered, users generally find it provides an elegant, natural and efficient solution to breaking down a complex set of data manipulations into a series of simple easy to understand steps. This is when users achieve the Zen of MongoDB aggregations and it is a lovely place to be.

MongoDB Aggregations is a programming language that is focussed on data-oriented problem solving rather than business process problem solving. It is essentially a [declarative programming language](https://en.wikipedia.org/wiki/Declarative_programming), rather than an [imperative programming language](https://en.wikipedia.org/wiki/Imperative_programming). Also, depending on how you squint, it can be regarded as a [functional programming language](https://en.wikipedia.org/wiki/Functional_programming) rather than a [procedural programming language](https://en.wikipedia.org/wiki/Procedural_programming). Why? Well an aggregation pipeline is an ordered series of declarative statements, called stages, where the entire output of one stage forms the entire input of the next stage, and so on, with no side-effects. This is probably the main reason why the Aggregation Framework is regarded as having a steeper learning curve compared with some programming languages. Not because it is inherently more difficult to understand but just because most developers come from a procedural programming background and not a functional one. They have to learn how to think like a functional programmer in addition to learning the Aggregation Framework.

It is the declarative and functional characteristics of MongoDB's Aggregation Framework which ultimately make it so powerful for processing massive data sets. Users focus on defining 'the what' in terms of the required outcome, in a declarative way, more than 'the how' of specifying the exact logic to apply to achieve each transformation. Each stage in a pipeline is forced to only have one specific clear advertised purpose. At runtime, the database engine is then able to understand the exact intent of each stage. For example, the database engine can get clear answers to the questions it asks, like, is this stage for performing a filter or is this stage for grouping on some fields?. Armed with this knowledge, the database engine is afforded the opportunity to optimise the pipeline at runtime, as illustrated in the diagram below. For example, it may decide to re-order stages to optimally leverage an index whilst being sure that output isn't changed. Or, it may decide to execute some stages in parallel against subsets of the data in different shards, reducing response time, whilst again ensuring the output is never changed.

![DB Engine Aggregations Optimisations](./pics/optimise.png)

Last and by far least in terms of importance is a discussion about syntax. So far MongoDB aggregations have been described here as a programming language, which it is (a Domain Specific Language). However, what is the syntax on which MongoDB's aggregations are based on? The answer is it depends and the answer is mostly irrelevant. In this book, the examples will be highlighted using the Mongo Shell and the JavaScript interpreter it runs in, with an aggregation pipeline being expressed using a [JSON](https://en.wikipedia.org/wiki/JSON) based syntax. However, if you are using one of the many [programming language drivers](https://docs.mongodb.com/drivers/) that MongoDB provides, you will be using that language to construct an aggregation pipeline, not JSON.


## What's In A Name?

You might have realised by now, there doesn't seem to be one single name for the subject of this book. You will often hear:

* Aggregation
* Aggregations
* Aggregation Framework
* Aggregation Pipeline
* Aggregation Pipelines
* Aggregation Language
* _...and so on_

The reality is any of these names is fine and it doesn't really matter which you use. In this book, each and all of these terms are probably used. Just take it as a positive sign that this MongoDB capability (and its title), was not born in a marketing boardroom. It was built by database engineers, for data engineers, where the branding was an afterthought at best! &#128518;


## What Do People Use The Aggregation Framework For?

The Aggregation Framework is versatile and used for many different types of data processing and manipulation tasks. Some common example uses are for:

* Realtime analytics
* Report generation with roll-ups, sums & averages
* Realtime dashboards
* Redacting data to present via views
* Joining data together from different collections on the 'server-side'
* Data science, including data discovery and data wrangling
* Mass data analysis at scale (a la '[big data](https://en.wikipedia.org/wiki/Big_data)')
* Realtime queries where deeper 'server-side' data post-processing is required than provided by the MongoDB Query Language ([MQL](https://docs.mongodb.com/manual/crud/))
* Copying and transforming subsets of data from one collection to another
* Navigating relationships between records, looking for patterns
* Data masking to redact & obfuscate sensitive data
* Peforming the Transform (T) part of an Extract-Load-Transform ([ELT](https://en.wikipedia.org/wiki/Extract,_load,_transform)) workload
* Data quality reporting and cleansing
* Updating a materialized view with the results of the most recent source data changes
* Supporting machine learning frameworks for efficient data analysis (e.g. via MongoDB's Spark Connector)
* _...and many more_

