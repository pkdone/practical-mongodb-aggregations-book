# History

## The Emergence Of Aggregations

MongoDB's developers released the first major version of the database (version 1.0) in February 2009. Back then, both users and the predominant company behind the database, [MongoDB Inc.](https://en.wikipedia.org/wiki/MongoDB_Inc.) (called _10gen_ back then) were still establishing the sort of use cases that it would excel at and where the critical gaps were. Within half a year of this first major release, MongoDB's engineering team had determined mass data processing was one of these gaps. Users needed a native way to analyse large amounts of data and group results containing totals and averages. In December 2009, in time for the following major release (1.2), the database engineers introduced a quick tactical solution to address this gap. This solution involved embedding a JavaScript engine in the database and allowing client applications to submit and execute 'server-side' logic using a simple [Map-Reduce](https://docs.mongodb.com/manual/core/map-reduce/) API.

A [Map-Reduce](https://en.wikipedia.org/wiki/MapReduce) workload essentially does two things. Firstly it scans the entire data set, looking for the matching subset of records required for the given scenario. This is the 'map' action. Secondly, it condenses the subset of matched data into grouped, totalled, and averaged result summaries. This is the 'reduce' action. Functionally, MongoDB's _Map-Reduce_ capability provided a solution to users' typical data processing requirements, but it came with the following drawbacks:

 1. Users have to provide two sets of JavaScript logic, a _map_ (or matching) function and a _reduce_ (or grouping/summing) function, and neither are very intuitive to develop, lacking a solid data-oriented bias
 2. At runtime, the lack of ability to explicitly associate a specific intent to an arbitrary piece of logic means that the database engine has no opportunity to identify and apply optimisations (e.g. targeting indexes or parallelising some steps); the database has to be conservative, executing the workload with minimal concurrency and employing locks at various stages to prevent race conditions and inconsistent results
 3. Lack of scalability across sharded clusters due to the way the database implements Map-Reduce in the codebase
 
Over a subsequent couple of years, as user behaviour with Map-Reduce became more understood, engineers within MongoDB Inc. could envision a better solution. They desired a more targeted capability leveraging a data-oriented Domain Specific Language (DSL). The engineers saw how to deliver a framework enabling a developer to define a series of data manipulation steps with valuable composability characteristics. Each step would have a clear advertised intent, allowing the database engine to apply optimisations at runtime. In August 2012, this solution, called the Aggregation Framework, was introduced in the 2.2 major version of MongoDB. MongoDB's Aggregation Framework provided a far more powerful, scalable and easy to use replacement to Map-Reduce.

Within its first year, the Aggregation Framework rapidly became the go-to tool for processing large volumes of data in MongoDB. Now, nearly a decade on, it is like the Aggregation Framework has always been part of MongoDB. It feels like part of the database's core DNA. MongoDB still supports Map-Reduce, but developers rarely use it nowadays. MongoDB aggregations are always the correct answer for processing data in the database!


## Key Releases & Capabilities 

Below is a summary of the evolution of the Aggregation Framework in terms of significant capabilities added in each major release:

* __MongoDB 2.2 (August 2012)__: Initial Release
* __MongoDB 2.4 (March 2013)__: Efficiency improvements, especially for sorts, concat operator
* __MongoDB 2.6 (April 2014)__: Unlimited size result sets, explain plans, spill to disk for large sorts, an option to output to a new collection, redact stage
* __MongoDB 3.0 (March 2015)__: Date-to-string operators
* __MongoDB 3.2 (December 2015)__: Sharded cluster optimisations, lookup (join) & sample stages, many new arithmetic & array operators
* __MongoDB 3.4 (November 2016)__: Graph-lookup, bucketing & facets stages, many new array & string operators 
* __MongoDB 3.6 (November 2017)__: Array to/from object operators, more extensive date to/from string operators, REMOVE variable
* __MongoDB 4.0 (July 2018)__: Number to/from string operators, string trimming operators
* __MongoDB 4.2 (August 2019)__: Merge stage to insert/update/replace records in existing non-sharded & sharded collections, set & unset stages to address the verbosity/rigidity of project stages, trigonometry operators, regular expression operators
* __MongoDB 4.4 (July 2020)__: Union stage, custom JavaScript expression operators (function & accumulator), first & last array element operators, string replacement operators, random number operator

