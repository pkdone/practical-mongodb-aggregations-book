# Can Expressions By Used Everywhere?

## What Are Aggregation Expressions?

Expressions are one of key things that gives aggregation pipelines their data manipulation power and expressiveness. However, they tend to be something that developers start using by just copying examples from the MongoDB Manual and then refactoring these examples, without thinking too much about what they really are. To enable developers to become more proficient with aggregation pipelines, expressions need to be demystified a little.

Expressions come in the following three main flavours:

 * __Field Paths.__ Accessed with a `$` prefix followed by the path of the field in each record being processed. &nbsp;Examples: `'$account.sortcode'`, `'$addresses.address.city'`
 
 * __Operators.__ Accessed with a `$`prefix followed by the operator function name. &nbsp;Examples:  `$arrayElemAt`, `$cond`, `$dateToString`  
 
 * __Variables.__ Accessed with  `$$` prefix followed by the fixed name, falling into two categories:
 
   - __Context variables.__ With values coming from the system environment rather than the each input record being processed. &nbsp;Examples:  `$$NOW`, `$$CLUSTER_TIME`
   
   - __Marker flag variables.__ To indicate desired behaviour to pass back to the pipeline runtime. &nbsp;Examples: `$$ROOT`, `$$REMOVE`, `$$PRUNE`

It is the ability to combine these three categories of expressions together when operating on input records, that enables complex comparisons and transformations of data to be achieved. To highlight this, the following in an excerpt from the [Mask Sensitive Fields](../examples/moderate-examples/mask-sensitive-fields.html) example in this book, which combines all three to optionally use an embedded document to be the value of a computed field (`customer_info`) or not include the computed field at all in the output.

```javascript
'customer_info': {'$cond': {
                    'if':   {'$eq': ['$customer_info.category', 'SENSITIVE']}, 
                    'then': '$$REMOVE',     
                    'else': '$customer_info',
                 }}
```

`$cond` is one of the operator expressions used here (a 'conditional' expression operator which takes three arguments: `if`, `then` & `else`). `$eq` is another expression operator (a 'comparison' expression operator). `$$REMOVE` is a 'marker flag' variable expression indicating to exclude the field. Both `$customer_info.category` and `$customer_info` are field path expressions referencing fields in each incoming record.


## Where They Expressions Used?

The following question is something that aggregation developers may not have asked themselves before, but asking this question and considering why the answer is what it is can help reveal more about what expressions really are and why they are used.

__Question:__ Can expressions be used within any type of pipeline stage?

__Answer:__ No

There are actually a number of types of stages in the Aggregation Framework which don't allow expressions to be embedded (or don't support embedded pipelines which indirectly allow expressions). Below is an example of these types of stages, notably omitting some of 'system-level' stages, like `$collStats`, from the list which don't relate to aggregating data:

 * `$match`
 * `$geoNear`
 * `$out`
 * `$limit`
 * `$skip`
 * `$sort`
 * `$sample`
 * `$count`
 
Some of these stages may be a surprise to you if you've never really thought about it before. You might well consider `$match` to be the most surprising item in this list. The content of a `$match` stage is just a set of query conditions,book with exactly the same syntax as MQL. There is a good reason for this. As described in the book section [Using Explain Plans](./explain.md), if the `$match` is the first stage of the pipeline (or can be optimised at runtime to become the first stage), the aggregation engine re-uses the MQL query engine to perform a 'regular' query against the collection, using the query conditions taken as-is from this first `$match` stage. 

Actually, in more recent versions of MongoDB the statement that `$match` is no longer entirely true. MongoDB version 3.6 introduced the new [$expr operator](https://docs.mongodb.com/manual/reference/operator/query/expr/#op._S_expr) and the ability to use this `$expr` operator instead of the normal MQL query conditions for the content of a `$match` stage. Inside the `$expr`, if used in a `$match`, any set of expressions can be used, composed of the `$` operator functions, `$` field paths and `$$` variables described earlier. Critically though, the query expressions in a `$expr` of `$match` cannot be used by the MQL query engine to leverage indexes. Therefore, it is only recommended to use `$expr` in a `$match` if there is no other way of assembling the query conditions required using the default MQL syntax. What can also be confusing when comparing the 'normal' MQL query condition syntax of a `$match` with aggregation expression syntax is that both sometimes have similarly named operators, e.g. `$gt`, with similar behaviour and both may reference field paths, but in subtly different ways, e.g. a `field.nestedfield` field reference in a `$match`/`find()`query condition versus a `$field.nestedfield` field path in an aggregation expression or `$expr`.

In most of the stages which don't leverage expressions, listed above, it doesn't usually make sense to try to make the stages' behaviour more 'dynamic'. For example, rather than providing a constant value of `20` to a `$limit` stage or a constant value of `80` to a `$skip` stage, it doesn't really make sense to somehow enable the value used to be manifested at runtime, based on values from the input records. The one stage that does need to be more expressive is the `$match` stage, but as discussed, this stage is already very expressive by virtue of being based on MQL query conditions, and if more dynamic behaviour is required, an `$expr` operator can be used.

