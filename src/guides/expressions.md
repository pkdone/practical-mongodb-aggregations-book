# Can Expressions Be Used Everywhere?

## What Are Aggregation Expressions?

Expressions are one of key things that gives aggregation pipelines their data manipulation power and expressiveness. However, they tend to be something that developers start using by just copying examples from the MongoDB Manual and then refactoring these examples, without thinking too much about what they really are. To enable developers to become more proficient with aggregation pipelines, expressions need to be demystified a little.

Expressions come in the following three main flavours:

 * __Field Paths.__ Accessed with a `$` prefix followed by the path of the field in each record being processed. &nbsp;Examples: `'$account.sortcode'`, `'$addresses.address.city'`
 
 * __Operators.__ Accessed with a `$`prefix followed by the operator function name. &nbsp;Examples:  `$arrayElemAt`, `$cond`, `$dateToString`  
 
 * __Variables.__ Accessed with a `$$` prefix followed by the fixed name, and falling into two sub-categories:
 
   - __Context variables.__ With values coming from the system environment rather than the each input record being processed. &nbsp;Examples:  `$$NOW`, `$$CLUSTER_TIME`
   
   - __Marker flag variables.__ To indicate desired behaviour to pass back to the pipeline runtime. &nbsp;Examples: `$$ROOT`, `$$REMOVE`, `$$PRUNE`

It is the ability to combine these three categories of expressions together when operating on input records, that enables complex comparisons and transformations of data to be achieved. To highlight this, the following is an excerpt from the [Mask Sensitive Fields](../examples/moderate-examples/mask-sensitive-fields.html) example in this book, which combines all three expressions. The example effectively retains an embedded sub-document field (`customer_info`) in each result record, unless a field in the original sub-document has a specific value (`category=SENSITIVE`).

```javascript
'customer_info': {'$cond': {
                    'if':   {'$eq': ['$customer_info.category', 'SENSITIVE']}, 
                    'then': '$$REMOVE',     
                    'else': '$customer_info',
                 }}
```

`$cond` is one of the operator expressions used here (a 'conditional' expression operator which takes three arguments: `if`, `then` & `else`). `$eq` is another expression operator (a 'comparison' expression operator). `$$REMOVE` is a 'marker flag' variable expression instructing the pipeline to exclude the field. Both `$customer_info.category` and `$customer_info` elements are field path expressions referencing fields of each incoming record.


## Where Are Expressions Used?

The following question is something that aggregation developers may not have asked themselves before, but asking this question and considering why the answer is what it is can help reveal more about what expressions really are and why they are used.

__Question:__ Can expressions be used within any type of pipeline stage?

__Answer:__ No

There are actually a number of types of stages in the Aggregation Framework which don't allow expressions to be embedded (or don't support embedded pipelines which indirectly allow expressions). Below is a list of these stages, but notably omitting some of the less relevant 'system-level' stages, like `$collStats`, which aren't used for processing data-sets:

 * `$match`
 * `$geoNear`
 * `$out`
 * `$limit`
 * `$skip`
 * `$sort`
 * `$sample`
 * `$count`
 
Some of these stages may be a surprise to you if you've never really thought about it before. You might well consider `$match` to be the most surprising item in this list. The content of a `$match` stage is actually just a set of query conditions, with exactly the same syntax as MQL. The content of a `$match` is not an aggregation expression. There is a good reason for this. As described in the chapter [Using Explain Plans](./explain.md), if the `$match` is the first stage of the pipeline (or can be optimised at runtime to become the first stage), the aggregation engine, when re-using the MQL query engine to perform a 'regular' query against the collection, uses the query conditions taken as-is from this first `$match` stage. All of MongoDB's query engine optimisations can then be used, including leveraging the optimum index. However, to complicate things a little, in more recent versions of MongoDB this statement about `$match` not supporting expressions is no longer entirely true (see the section below in this chapter for more details).

In most of the stages which don't leverage expressions, it doesn't usually make sense to try to make the behaviour of each stage more 'dynamic'. For example, rather than providing a constant value of `20` to a `$limit` stage or a constant value of `80` to a `$skip` stage, it doesn't really make sense to somehow enable the value used to be manifested at runtime, based on values from the input records. Thus for these stages, being able to define an expression would add no value. The one stage that does need to be more expressive is the `$match` stage, but as discussed, this stage is already very expressive by virtue of being based on MQL query conditions. 


## What Is The Option To Use $expr Inside $match All About?

MongoDB version 3.6 introduced the new [$expr operator](https://docs.mongodb.com/manual/reference/operator/query/expr/#op._S_expr) and the ability to use this `$expr` operator instead of the normal MQL query conditions for the content of a `$match` stage. Inside a `$expr`, if used in a `$match`, any composite expression can be used, made up of the `$` operator functions, the `$` field paths and the `$$` variables described earlier.

There a few situations that demand having to use `$expr` from inside a `$match` stage. Sometimes there may be a requirement to compare two fields of a record to determine whether to keep the record in the results based on the the outcome of this comparison. Another common situation is where there is a need to compute a value based on some existing fields and then compare the computed value with some specific criteria using a comparison operator. This is something that is impossible to achieve using normal `$match`/`find()`query conditions.

Take the example of a `rectangles` collection holding data on different instances of rectangles and specifically their width and height, similar to the following: 

```javascript
[
  { _id: 1, width: 2, height: 8 },
  { _id: 2, width: 3, height: 4 },
  { _id: 3, width: 20, height: 1 }
]
```

Now what if you wanted to run an aggregation pipeline to only return rectangles which have an `area` greater than `12`. This isn't possible using a regular `$match`/`find()` query condition. However, using aggregation expressions, different fields can be analysed together, in-situ. Therefore, by using a `$expr` inside a `$match` this requirement can be achieved, by using the following pipeline, for example:

```javascript
var pipeline = [
  {'$match': {
    '$expr': {'$gt': [{'$multiply': ['$width', '$height']}, 12]},
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

As you can see, the 2nd shape was not included in the results because its area is only `12` (`3 x 4`).

It is important to be aware though that in many cases, a query expressions in a `$expr` for a `$match` cannot be used by the MQL query engine to leverage an index. Specifically, 'range' comparison operators like `$gt`, `$gte`, `$lt` and `$lte` will not result in an index being employed. As a result, it is only recommended to use `$expr` in a `$match` if there is no other way of assembling the required query conditions using the default MQL syntax.

What can also be confusing, when comparing the 'normal' MQL query condition syntax of a `$match` with aggregation expression syntax, is that both sometimes have similarly named operators, e.g. `$gt`. Also, both may reference field paths, but in subtly different ways. For example, a `attr.nestedattr` field reference in a `$match`/`find()`query condition versus a `$attr.nestedattr` field path in an aggregation expression. Lastly, as we've just seen, for query conditions a field can only be compared with a literal value, whereas for expressions a field can be compared with another field.

