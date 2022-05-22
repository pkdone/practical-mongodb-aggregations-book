# History Of MongoDB Aggregations

## The Emergence Of Aggregations

MongoDB's developers released the first major version of the database (version 1.0) in February 2009. Back then, both users and the predominant company behind the database, [MongoDB Inc.](https://en.wikipedia.org/wiki/MongoDB_Inc.) (called _10gen_ at the time) were still establishing the sort of use cases that the database would excel at and where the critical gaps were. Within half a year of this first major release, MongoDB's engineering team had identified a need to enable materialised views to be generated on-demand. Users needed this capability to maintain counts, sums, and averages for their real-time client applications to query. In December 2009, in time for the following major release (1.2), the database engineers introduced a quick tactical solution to address this gap. This solution involved embedding a JavaScript engine in the database and allowing client applications to submit and execute "server-side" logic using a simple [Map-Reduce](https://docs.mongodb.com/manual/core/map-reduce/) API.

A [Map-Reduce](https://en.wikipedia.org/wiki/MapReduce) workload essentially does two things. Firstly it scans the entire data set, looking for the matching subset of records required for the given scenario. This phase may also transform or exclude the fields of each record. This is the "map" action. Secondly, it condenses the subset of matched data into grouped, totalled, and averaged result summaries. This is the "reduce" action. Functionally, MongoDB's _Map-Reduce_ capability provides a solution to users' typical data processing requirements, but it comes with the following drawbacks:

 1. The database has to bolt in an inherently slow JavaScript engine to execute users' Map-Reduce code.
 2. Users have to provide two sets of JavaScript logic, a _map_ (or matching) function and a _reduce_ (or grouping) function. Neither is very intuitive to develop, lacking a solid data-oriented bias.
 3. At runtime, the lack of ability to explicitly associate a specific intent to an arbitrary piece of logic means that the database engine has no opportunity to identify and apply optimisations. It is hard for it to target indexes or re-order some logic for more efficient processing. The database has to be conservative, executing the workload with minimal concurrency and employing locks at various times to prevent race conditions and inconsistent results.
 4. Poor scalability because the monolithic and opaque nature of Map-Reduce logic means the database engine can't break parts of it up and execute these parts in parallel across multiple shards.

Over the following two years, as user behaviour with Map-Reduce became more understood, MongoDB engineers started to envision a better solution. Also, users were increasingly trying to use Map-Reduce to perform mass data processing given MongoDB's ability to hold large data sets. They were hitting the same Map-Reduce limitations. Users desired a more targeted capability leveraging a data-oriented Domain Specific Language (DSL). The engineers saw how to deliver a framework enabling a developer to define a series of data manipulation steps with valuable composability characteristics. Each step would have a clear advertised intent, allowing the database engine to apply optimisations at runtime. The engineers could also design a framework that would execute "natively" in the database and not require a JavaScript engine. In August 2012, this solution, called the Aggregation Framework, was introduced in the 2.2 version of MongoDB. MongoDB's Aggregation Framework provided a far more powerful, efficient, scalable and easy to use replacement to Map-Reduce.

Within its first year, the Aggregation Framework rapidly became the go-to tool for processing large volumes of data in MongoDB. Now, a decade on, it is like the Aggregation Framework has always been part of MongoDB. It feels like part of the database's core DNA. MongoDB still supports Map-Reduce, but developers rarely use it nowadays. MongoDB aggregation pipelines are always the correct answer for processing data in the database!

> _It is not widely known, but MongoDB's engineering team re-implemented the Map-Reduce "back-end" in MongoDB 4.4 to execute within the aggregations runtime. They had to develop some additional aggregation stages and operators to fill some gaps. For the most part, these are internal-only stages or operators that the Aggregation Framework does not surface for developers to use in regular aggregations. The two exceptions are the new [$function](https://docs.mongodb.com/manual/reference/operator/aggregation/function/) and [$accumulator](https://docs.mongodb.com/manual/reference/operator/aggregation/accumulator/) 4.4 operators, which the refactoring work influenced and which now serve as two useful operators for use in any aggregation pipeline. In MongoDB 4.4, each Map-Reduce "aggregation" still uses JavaScript for certain phases, and so it will not achieve the performance of a native aggregation for an equivalent workload. Nor does this change magically address the other drawbacks of Map-Reduce workloads concerning composability, concurrency,  scalability and opportunities for runtime optimisation. The primary purpose of the change was for the database engineers to eliminate redundancy and promote resiliency in the database's codebase. With MongoDB 5.0, Map-Reduce is now deprecated, and it is likely to be removed in the subsequent major version of MongoDB._


## Key Releases & Capabilities 

Below is a summary of the evolution of the Aggregation Framework in terms of significant capabilities added in each major release:

* __MongoDB 2.2 (August 2012)__: Initial Release
* __MongoDB 2.4 (March 2013)__: Efficiency improvements (especially for sorts), a concat operator
* __MongoDB 2.6 (April 2014)__: Unlimited size result sets, explain plans, spill to disk for large sorts, an option to output to a new collection, a redact stage
* __MongoDB 3.0 (March 2015)__: Date-to-string operators
* __MongoDB 3.2 (December 2015)__: Sharded cluster optimisations, lookup (join) & sample stages, many new arithmetic & array operators
* __MongoDB 3.4 (November 2016)__: Graph-lookup, bucketing & facets stages, many new array & string operators 
* __MongoDB 3.6 (November 2017)__: Array to/from object operators, more extensive date to/from string operators, a REMOVE variable
* __MongoDB 4.0 (July 2018)__: Number to/from string operators, string trimming operators
* __MongoDB 4.2 (August 2019)__: A merge stage to insert/update/replace records in existing non-sharded & sharded collections, set & unset stages to address the verbosity/rigidity of project stages, trigonometry operators, regular expression operators, Atlas Search integration
* __MongoDB 4.4 (July 2020)__: A union stage, custom JavaScript operator expressions (function & accumulator), first & last array element operators, string replacement operators, a random number operator
* __MongoDB 5.0 (July 2021)__: A setWindowFields stage, time-series/window operators, date manipulation operators
* __MongoDB 5.1 (November 2021)__: Support for lookup & graph-lookup stages joining to sharded collections, documents and densify stages
* __MongoDB 5.2 (January 2022)__: An array sorting operator, operators to get a subset of ordered arrays and a subset of ordered grouped documents
* __MongoDB 5.3 (April 2022)__: A fill stage, a linearFill operator
* __MongoDB 6.0 (TODO 2022)__: TODO

