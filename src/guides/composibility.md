# Embrace Composability For Increased Productivity

As described in this book's introduction, an aggregation pipeline is an ordered series of declarative statements, called stages. The entire output of one stage forms the whole input of the next stage, and so on, with no side effects. Pipelines exhibit high [composability](https://en.wikipedia.org/wiki/Composability) where stages are stateless self-contained components selected and assembled in various combinations (pipelines) to satisfy specific requirements. This composability promotes iterative prototyping, with straightforward testing after each increment.

With MongoDB's aggregations, you can take a complex problem, requiring a complex aggregation pipeline, and break it down into straightforward individual stages, where each step can be developed and tested in isolation first. To better comprehend this composability, it may be helpful to internalise the following visual model.

![Pipelines Equivalence](./pics/pipeline-equivalence.png)

Suppose you have two pipelines with one stage in each and run the second pipeline after completing the first pipeline. The final result set is the same as if you have just run a single pipeline containing both stages serially. There is no difference between the two. As a developer, you can reduce the [cognitive load](https://en.wikipedia.org/wiki/Cognitive_load) by understanding how a problem can be broken down in this way when building aggregation pipelines. Aggregation pipelines enable you to decompose a big challenge into lots of minor challenges. By embracing this approach of first developing each stage separately, you will find even the most complex challenges become surmountable.

## Specific Tips To Promote Composability

In reality, once most developers become adept at using the Aggregation Framework, they tend not to rely on temporary intermediate collections whilst prototyping each stage. However, it is still a reasonable development approach if you prefer it. Instead, seasoned aggregation pipeline developers typically comment out one or more stages of an aggregation pipeline when using the Mongo Shell (or they use the 'disable stage' capability provided by the [GUI tools](./getting-started.md) for MongoDB).

To encourage composability and hence productivity, some of the principles to strive for are:

 * Easy disabling of subsets of stages, whilst prototyping
 * Easy addition of new fields to a stage or new stages to a pipeline by performing a copy, a paste and then a modification without hitting cryptic error messages resulting from issues like missing a comma before the added element
 * Easy appreciation of each distinct stage's purpose, at a glance

With these principles in mind, the following is an opinionated list of guidelines for how you should textually craft your pipelines in JavaScript to improve your pipeline development pace:

 1. Don't start or end a stage on the same line as another stage
 2. For every field in a stage, and stage in a pipeline, include a trailing comma even if it is currently the last item
 3. Include an empty newline between every stage
 4. For complex stages include a `//` comment with an explanation on a newline before the stage
 5. To 'disable' some stages of a pipeline whilst prototyping another stage, use the multi-line comment `/*` prefix and `*/` suffix

Below is an example of a poor pipeline layout if you have followed none of the guiding principles:

```javascript
// BAD

var pipeline = [
  {"$unset": [
    "_id",
    "address"
  ]}, {"$match": {
    "dateofbirth": {"$gte": ISODate("1970-01-01T00:00:00Z")}
  }}//, {"$sort": {
  //  "dateofbirth": -1
  //}}, {"$limit": 2} */
];
```

Whereas the following is an example of a far better pipeline layout, where you meet all of the guiding principles:

```javascript
// GOOD

var pipeline = [
  {"$unset": [
    "_id",
    "address",
  ]},    
    
  // Only match people born on or after 1st Janurary 1970
  {"$match": {
    "dateofbirth": {"$gte": ISODate("1970-01-01T00:00:00Z")},
  }},
  
  /*
  {"$sort": {
    "dateofbirth": -1,
  }},      
    
  {"$limit": 2},  
  */
];
```

Notice trailing commas are included in the code snippet, at both the end of stage level and end of field level.

It is also worth mentioning that some (but not all) developers take an alternative but an equally valid approach to constructing a pipeline. They decompose each stage in the pipeline into different JavaScript variables, where each stage's variable is defined separately, as shown in the example below:

```javascript
// GOOD

var unsetStage = {
  "$unset": [
    "_id",
    "address",
  ]};    

var matchStage = {
  "$match": {
    "dateofbirth": {"$gte": ISODate("1970-01-01T00:00:00Z")},
  }};

var sortStage = {
   "$sort": {
    "dateofbirth": -1,
  }}; 


var limitStage = {"$limit": 2};
    
var pipeline = [
  unsetStage,
  matchStage,
  sortStage,
  limitStage,
];
```

Furthermore, developers may choose to decompose elements inside a stage into additional variables to avoid code 'typos'. For instance, to avoid one part of a pipeline incorrectly referencing a field computed earlier in the pipeline by inaccurately misspelling this reference.

This book is not advocating a multi-variable approach over a single-variable approach when you define a pipeline. It is just highlighting two highly composable options. Ultimately it is a personal choice concerning which you find most comfortable and productive. Indeed, some developers will go a step further if they do not intend to transfer the prototyped pipeline to another programming language. They will factor out complex boilerplate parts of a pipeline into separate JavaScript functions. They can re-use each function from multiple places within the main JavaScript-based pipeline.

