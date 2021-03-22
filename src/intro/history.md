# History

## The Emergence Of Aggregations

The MongoDB database was first released in February 2009 (version 1.0). Back then, both users and the predominant company engineering the database, [MongoDB Inc.](https://en.wikipedia.org/wiki/MongoDB_Inc.) (called _10gen_ back then), were still establishing the sort of use cases that the database would excel at, and where the gaps and paper-cuts were. Within half a year of this first major release, MongoDB's engineering team had determined that users were needing a native way to process large amounts of data, to group the data into results containing totals and averages for example. A quick tactical engineering solution was introduced, in time for the next release (1.2) in December 2009. This involved embedding a JavaScript engine in the database, allowing client applications to submit some JavaScript logic to be executed, 'server-side', adhering to a simple [Map-Reduce](https://docs.mongodb.com/manual/core/map-reduce/) API provided by the database.

A [Map-Reduce](https://en.wikipedia.org/wiki/MapReduce) workload essentially does two things. Firstly it scans the full data-set looking for the matching subset of records required for the given scenario (the 'map' action). Secondly, it then condenses the subset of matched data down into grouped, totalled and averaged result summaries (the 'reduce' action). Functionally, MongoDB's _Map-Reduce_ capability provided a solution to users' common data processing requirements in MongoDB, but it came with the following drawbacks:

 1. Users have to provide two sets of JavaScript logic, a map (or matching) function and a reduce (or grouping/summing) function, and neither are very intuitive to develop, lacking a strong data-oriented bias
 2. At runtime, the lack of ability to explicitly associate a specific intent to an arbitrary piece of logic means that the database engine has no opportunity to identify and apply optimisations (e.g. targetting indexes or parallelising some steps); the database has to be conservative, executing the workload with minimal concurrency and employing locks at various stages to prevent the risk of race conditions, corruptions and inconsistencies in results
 3. Lack of scalability across Sharded clusters by virtue of the way Map-Reduce is implemented in the codebase
 
Over the subsequent couple of years, as user behaviour with and without Map-Reduce became more understood, engineers within MongoDB Inc. were able to envision and then build a more targeted and data-oriented Domain Specific Language (DSL). They saw how to deliver a framework with strong developer composability characteristics, where each stage has clear advertised intent thus allowing the realisation of runtime optimisations by the database engine. In August 2012, this solution, called the Aggregation Framework, was introduced in the 2.2 release version of MongoDB. MongoDB's Aggregation Framework provided a far more powerful, scalable and easy to use replacement to Map-Reduce.

Within its first year the Aggregation Framework rapidly become the go to tool for processing large volumes of data in MongoDB. Now, nearly a decade on, to many users it is like the Aggregation Framework has always been part of MongoDB. It feels like part of the database's core DNA. Map-Reduce is still supported in MongoDB but it is rarely used nowadays. MongoDB aggregations is always the right answer for processing data in the database!


## Key Releases & Capabilities 

Below is a summary of how the Aggregation Framework has evolved over its lifetime and the additional capabilities added in each major release:

* __MongoDB 2.2 (August 2012)__: Initial Release
* __MongoDB 2.4 (March 2013)__: Efficiency improvements especially for sorts, concat operator
* __MongoDB 2.6 (April 2014)__: Unlimited size result sets, explain plans, spill to disk for large sorts, option to output to a new collection, redact stage
* __MongoDB 3.0 (March 2015)__: Date-to-string operators
* __MongoDB 3.2 (December 2015)__: Sharded cluster optimisations, lookup (join) & sample stages, many new arithmetic & array operators
* __MongoDB 3.4 (November 2016)__: Graph-lookup, bucketing & facets stages, many new array & string operators 
* __MongoDB 3.6 (November 2017)__: Array to/from object operators, more extensive date to/from string operators, REMOVE variable
* __MongoDB 4.0 (July 2018)__: Number to/from string operators, string trimming operators
* __MongoDB 4.2 (August 2019)__: Merge stage to insert/update/replace records in existing non-sharded & sharded collections, set & unset stages to address the verbosity/rigidity of project stages, trigonometry operators, regular expression operators
* __MongoDB 4.4 (July 2020)__: Union stage, custom JavaScript expression operators (function & accumulator), first & last array element operators, string replacement operators, random number operator

