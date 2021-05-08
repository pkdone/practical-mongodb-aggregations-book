# Expressions Explained

## What Are Aggregation Expressions?

Expressions give aggregation pipelines their data manipulation power. However, they tend to be something that developers start using by just copying examples from the MongoDB Manual and then refactoring these without thinking enough about what they are. Proficiency in aggregation pipelines demands a deeper understanding of expressions.

Expressions come in one of three primary flavours:

 * __Operators.__ Accessed with a `$` prefix followed by the operator function name. These are used as the keys for objects. &nbsp;Examples:  `$arrayElemAt`, `$cond`, `$dateToString`
 
 * __Field Paths.__ Accessed with a `$` prefix followed by the field's path in each record being processed. &nbsp;Examples: `$account.sortcode`, `$addresses.address.city`
 
 * __Variables.__ Accessed with a `$$` prefix followed by the fixed name and falling into three sub-categories:
 
   - __Context system variables.__ With values coming from the system environment rather than each input record an aggregation stage is processing. &nbsp;Examples:  `$$NOW`, `$$CLUSTER_TIME`
   
   - __Marker flag system variables.__ To indicate desired behaviour to pass back to the aggregation runtime. &nbsp;Examples: `$$ROOT`, `$$REMOVE`, `$$PRUNE`

   - __Bind user variables.__ For storing values you declare with a `$let` operator (or with the 'let' option of a `$lookup` stage, or 'as' option of a `$map` or `$filter` stage). &nbsp;Examples: `$$product_name_var`, `$$order_id_var`

You can combine these three categories of expressions when operating on input records, enabling you to perform complex comparisons and transformations of data. To highlight this, the code snippet below is an excerpt from this book's [Mask Sensitive Fields](../examples/intricate-examples/mask-sensitive-fields.html) example, which combines all three expressions.

```javascript
"customer_info": {"$cond": {
                    "if":   {"$eq": ["$customer_info.category", "SENSITIVE"]}, 
                    "then": "$$REMOVE",     
                    "else": "$customer_info",
                 }}
```

The pipeline retains an embedded sub-document (`customer_info`) in each resulting record unless a field in the original sub-document has a specific value (`category=SENSITIVE`). `$cond` is one of the operator expressions used in the excerpt (a 'conditional' expression operator which takes three arguments: `if`, `then` & `else`). `$eq` is another expression operator (a 'comparison' expression operator). `$$REMOVE` is a 'marker flag' variable expression instructing the pipeline to exclude the field. Both `$customer_info.category` and `$customer_info` elements are field path expressions referencing each incoming record's fields.


## Where Expressions Are Used

The following question is something you may not have asked yourself before, but asking this question and considering why the answer is what it is can help reveal more about what expressions are and why you use them.

__Question:__ Can expressions be used within any type of pipeline stage?

__Answer:__ No

There are many types of stages in the Aggregation Framework that don't allow expressions to be embedded. Examples of some of the most commonly used of these stages are:

 * `$match`
 * `$limit`
 * `$skip`
 * `$sort`
 * `$count`
 * `$lookup`
 * `$out`

Some of these stages may be a surprise to you if you've never really thought about it before. You might well consider `$match` to be the most surprising item in this list. The content of a `$match` stage is just a set of query conditions with the same syntax as MQL rather than an aggregation expression. There is a good reason for this. The aggregation engine re-uses the MQL query engine to perform a 'regular' query against the collection, enabling the query engine to use all its usual optimisations. The query conditions are taken as-is from the `$match` stage at the top of the pipeline. Therefore, the `$match` filter must use the same syntax as MQL. 

In most of the stages that are unable to leverage expressions, it doesn't usually make sense for their behaviour to be dynamic, based on the pipeline data entering the stage. For a client application that paginates results, you might define a value of `20` for the`$limit` stage. However, maybe you want to dynamically bind a value to the `$limit` stage, sourced by a `$lookup` stage earlier in the pipeline. The lookup operation might pull in the user's preferred 'page list size' value from a 'user preferences' collection. Nonetheless, the Aggregation Framework does not support this today for the listed stage types to avoid the overhead of the extra checks it would need to perform for what are primarily rare cases.

Only one of the listed stages needs to be more expressive: the `$match` stage, but this stage is already flexible by being based on MQL query conditions. 


## What Is Using $expr Inside $match All About?

Complicating things a little, in more recent MongoDB versions, the statement about `$match` not supporting expressions is inaccurate. MongoDB version 3.6 introduced the [$expr operator](https://docs.mongodb.com/manual/reference/operator/query/expr/) used in regular MQL queries and hence in `$match` stages too. Inside an  `$expr` operator, you can include any composite expression fashioned from `$` operator functions, `$` field paths and `$$` variables.

A few situations demand having to use `$expr` from inside a `$match` stage. Examples include:

 * A requirement to compare two fields from the same record to determine whether to keep the record based on the comparison's outcome
 * A requirement to perform a calculation based on values from multiple existing fields in each record and then comparing the calculation to a constant
 
These are impossible in an aggregation (or MQL `find()`) if you use regular `$match` query conditions.

Take the example of a collection holding information on different instances of rectangles (capturing their width and height), similar to the following: 

```javascript
[
  { _id: 1, width: 2, height: 8 },
  { _id: 2, width: 3, height: 4 },
  { _id: 3, width: 20, height: 1 }
]
```

What if you wanted to run an aggregation pipeline to only return rectangles with an `area` greater than `12`? This comparison isn't possible in a conventional aggregation when using a single `$match` query condition. However, with `$expr`, you can analyse a combination of fields in-situ using expressions. You can implement the requirement with the following pipeline:

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

As you can see, the second of the three shapes is not output because its area is only `12` (`3 x 4`).

You should be aware that in many cases, the query engine cannot benefit from an index when using a `$expr` operator inside a `$match` stage. Specifically, if you use a 'range' comparison operator (`$gt`, `$gte`, `$lt` and `$lte`) with a field, no index will be employed to match the field. You should only use the `$expr` operator in a `$match` stage if there is no other way of assembling the criteria using regular MQL syntax criteria.

