# Can Expressions Be Used Everywhere?

## What Are Aggregation Expressions?

Expressions give aggregation pipelines their data manipulation power and expressiveness. However, they tend to be something that developers start using by just copying examples from the MongoDB Manual and then refactoring these without thinking enough about what they are. Proficiency in aggregation pipelines demands a deeper understanding of expressions.

Expressions come in one of three primary flavours:

 * __Field Paths.__ Accessed with a `$` prefix followed by the field's path in each record being processed. &nbsp;Examples: `$account.sortcode`, `$addresses.address.city`
 
 * __Operators.__ Accessed with a `$`prefix followed by the operator function name. &nbsp;Examples:  `$arrayElemAt`, `$cond`, `$dateToString`
 
 * __Variables.__ Accessed with a `$$` prefix followed by the fixed name and falling into two sub-categories:
 
   - __Context variables.__ With values coming from the system environment rather than each input record, an aggregation stage is processing. &nbsp;Examples:  `$$NOW`, `$$CLUSTER_TIME`
   
   - __Marker flag variables.__ To indicate desired behaviour to pass back to the pipeline runtime. &nbsp;Examples: `$$ROOT`, `$$REMOVE`, `$$PRUNE`

You can combine these three categories of expressions when operating on input records, enabling you to perform complex comparisons and transformations of data. To highlight this, the code snippet below is an excerpt from this book's [Mask Sensitive Fields](../examples/moderate-examples/mask-sensitive-fields.html) example, which combines all three expressions.

```javascript
"customer_info": {"$cond": {
                    "if":   {"$eq": ["$customer_info.category", "SENSITIVE"]}, 
                    "then": "$$REMOVE",     
                    "else": "$customer_info",
                 }}
```

The pipeline retains an embedded sub-document (`customer_info`) in each resulting record unless a field in the original sub-document has a specific value (`category=SENSITIVE`). `$cond` is one of the operator expressions used in the excerpt (a 'conditional' expression operator which takes three arguments: `if`, `then` & `else`). `$eq` is another expression operator (a 'comparison' expression operator). `$$REMOVE` is a 'marker flag' variable expression instructing the pipeline to exclude the field. Both `$customer_info.category` and `$customer_info` elements are field path expressions referencing incoming record's fields.


## Can Expressions Be Used Everywhere?

The following question is something you may not have asked yourself before, but asking this question and considering why the answer is what it is can help reveal more about what expressions are and why you use them.

__Question:__ Can expressions be used within any type of pipeline stage?

__Answer:__ No

There are many types of stages in the Aggregation Framework that don't allow expressions to be embedded (or don't support embedded pipelines that indirectly allow expressions). They stages are:

 * `$match`
 * `$geoNear`
 * `$out`
 * `$limit`
 * `$skip`
 * `$sort`
 * `$sample`
 * `$count`

> _(irrelevant 'system-level' stages, like `$collStats`, are omitted because you don't use them for manipulating data)_


Some of these stages may be a surprise to you if you've never really thought about it before. You might well consider `$match` to be the most surprising item in this list. The content of a `$match` stage is just a set of query conditions with the same syntax as MQL rather than an aggregation expression. There is a good reason for this. The aggregation engine re-uses the MQL query engine to perform a 'regular' query against the collection, enabling the query engine to use all its usual optimisations. The query conditions are taken as-is from the `$match` stage at the top of the pipeline. Therefore, the `$match` filter must use the same syntax as MQL. 

In most of the stages that don't leverage expressions, it doesn't usually make sense for their behaviour to be more 'dynamic'. For example, you might provide a constant value of `20` to a `$limit` stage or a constant value of `80` to a `$skip` stage. It is hard to think of a scenario where a pipeline would need to calculate these values at runtime instead, based on the input data. Only one of the listed stages needs to be more expressive: the `$match` stage, but this stage is already sufficiently flexible by being based on MQL query conditions. 


## What Is The Option To Use $expr Inside $match All About?

In more recent MongoDB versions, the statement about `$match` not supporting expressions is no longer entirely accurate to complicate things a little. TODOX

MongoDB version 3.6 introduced the new [$expr operator](https://docs.mongodb.com/manual/reference/operator/query/expr/) and the ability to use this `$expr` operator instead of the normal MQL query conditions for the content of a `$match` stage. Inside a `$expr`, if used in a `$match`, any composite expression can be leveraged, made up of the `$` operator functions, the `$` field paths and the `$$` variables described earlier.

There are a few situations that demand having to use `$expr` from inside a `$match` stage, if the MQL `$where` operator is to be ignored (`$where` comes with various downsides and so should be avoided). Sometimes there may be a requirement to compare two fields of a record to determine whether to keep the record in the results based on the the outcome of that comparison. Another common situation is where there is a need to compute a value based on some existing fields and then compare the computed value with some specific criteria using a comparison operator. This is something that is impossible to achieve using normal `$match`/`find()`query conditions.

Take the example of a `rectangles` collection holding data on different instances of rectangles and specifically their width and height, similar to the following: 

```javascript
[
  { _id: 1, width: 2, height: 8 },
  { _id: 2, width: 3, height: 4 },
  { _id: 3, width: 20, height: 1 }
]
```

Now what if you wanted to run an aggregation pipeline to only return rectangles which have an `area` greater than `12`. This isn't possible using a regular `$match`/`find()` query condition. However, using aggregation expressions, different fields can be analysed in combination, in-situ. By using a `$expr` inside a `$match` this requirement can be achieved with the following pipeline for example:

```javascript
var pipeline = [
  {"$match": {
    "$expr": {"$gt": [{"$multiply": ["$width", "$height"]}, 12]},
  }},      
];
```

The result of executing an aggregation with this pipeline is:

```javascript
[
  { _id: 1, width: 2, height: 8 },
  { _id: 3, width: 20, height: 1 }
]
```

As you can see, the 2<sup>nd</sup> shape was not included in the results because its area is only `12` (`3 x 4`).

It is important to be aware though that in many cases, a query expressions in a `$expr` for a `$match` cannot be used by the MQL query engine to leverage an index. Specifically, 'range' comparison operators, like `$gt`, `$gte`, `$lt` and `$lte`, will not result in an index being employed. As a result, it is only recommended to use `$expr` in a `$match` if there is no other way of assembling the required query conditions using the default MQL syntax.

What can also be confusing, when comparing the 'normal' MQL query condition syntax of a `$match` with aggregation expression syntax, is that both sometimes have similarly named operators, e.g. `$gt`. Also, both may reference field paths, but in subtly different ways. For example, a `attr.nestedattr` field reference in a `$match`/`find()`query condition versus a `$attr.nestedattr` field path in an aggregation expression. Lastly, as we've just seen, for query conditions a field can only be compared with a literal value, whereas for expressions a field can be compared with another field.

