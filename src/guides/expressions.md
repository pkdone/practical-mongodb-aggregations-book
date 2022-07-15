# Expressions Explained

## Summarising Aggregation Expressions

Expressions give aggregation pipelines their data manipulation power. However, they tend to be something that developers start using by just copying examples from the MongoDB Manual and then refactoring these without thinking enough about what they are. Proficiency in aggregation pipelines demands a deeper understanding of expressions.

Aggregation expressions come in one of three primary flavours:

 * __Operators.__ Accessed as an object with a `$` prefix followed by the operator function name. The "_dollar-operator-name_" is used as the main key for the object. &nbsp;Examples:  `{$arrayElemAt: ...}`, `{$cond: ...}`, `{$dateToString: ...}`
 
 * __Field Paths.__ Accessed as a string with a `$` prefix followed by the field's path in each record being processed. &nbsp;Examples: `"$account.sortcode"`, `"$addresses.address.city"`
 
 * __Variables.__ Accessed as a string with a `$$` prefix followed by the fixed name and falling into three sub-categories:
 
   - __Context System Variables.__ With values coming from the system environment rather than each input record an aggregation stage is processing. &nbsp;Examples:  `"$$NOW"`, `"$$CLUSTER_TIME"`
   
   - __Marker Flag System Variables.__ To indicate desired behaviour to pass back to the aggregation runtime. &nbsp;Examples: `"$$ROOT"`, `"$$REMOVE"`, `"$$PRUNE"`

   - __Bind User Variables.__ For storing values you declare with a `$let` operator (or with the `let` option of a `$lookup` stage, or `as` option of a `$map` or `$filter` stage). &nbsp;Examples: `"$$product_name_var"`, `"$$orderIdVal"`

You can combine these three categories of aggregation expressions when operating on input records, enabling you to perform complex comparisons and transformations of data. To highlight this, the code snippet below is an excerpt from this book's [Mask Sensitive Fields](../examples/securing-data/mask-sensitive-fields.html) example, which combines all three expressions.

```javascript
"customer_info": {"$cond": {
                    "if":   {"$eq": ["$customer_info.category", "SENSITIVE"]}, 
                    "then": "$$REMOVE", 
                    "else": "$customer_info",
                 }}
```

The pipeline retains an embedded sub-document (`customer_info`) in each resulting record unless a field in the original sub-document has a specific value (`category=SENSITIVE`). `{$cond: ...}` is one of the operator expressions used in the excerpt (a "conditional" operator expression which takes three arguments: `if`, `then` & `else`). `{$eq: ...}` is another operator expression (a "comparison" operator expression). `"$$REMOVE"` is a "marker flag" variable expression instructing the pipeline to exclude the field. Both `"$customer_info.category"` and `"$customer_info"` elements are field path expressions referencing each incoming record's fields.


## What Do Expressions Produce?

As described above, an expression can be an Operator (e.g. `{$concat: ...}`), a Variable (e.g. `"$$ROOT"`) or a Field Path (e.g. `"$address"`). In all these cases, an expression is just something that dynamically populates and returns a new [JSON](https://en.wikipedia.org/wiki/JSON#Data_types)/[BSON](https://en.wikipedia.org/wiki/BSON) data type element, which can be one of:
* a Number &nbsp;_(including integer, long, float, double, decimal128)_
* a String &nbsp;_(UTF-8)_
* a Boolean
* a DateTime &nbsp;_(UTC)_
* an Array
* an Object

However, a specific expression can restrict you to returning just one or a few of these types. For example, the `{$concat: ...}` Operator, which combines multiple strings, can only produce a _String_ data type (or null). The Variable `"$$ROOT"` can only return an _Object_ which refers to the root document currently being processed in the pipeline stage. 

A Field Path (e.g. `"$address"`) is different and can return an element of any data type, depending on what the field refers to in the current input document. For example, suppose `"$address"` references a sub-document. In this case, it will return an _Object_. However, if it references a list of elements, it will return an _Array_. As a human, you can guess that the Field Path `"$address"` won't return a _DateTime_, but the aggregation runtime does not know this ahead of time. There could be even more dynamics at play. Due to MongoDB's flexible data model, `"$address"` could yield a different type for each record processed in a pipeline stage. The first record's `address` may be an _Object_ sub-document with street name and city fields. The second record's `address` might represent the full address as a single _String_.

In summary, _Field Paths_ and _Bind User Variables_ are expressions that can return any JSON/BSON data type at runtime depending on their context. For the other kinds of expressions (_Operators_, _Context System Variables_ and _Marker Flag System Variables_), the data type each can return is fixed to one or a set number of documented types. To establish the exact data type produced by these specific operators, you need to consult the [Aggregation Pipeline Quick Reference documentation](https://docs.mongodb.com/manual/meta/aggregation-quick-reference/). 

For the Operator category of expressions, an expression can also take other expressions as parameters, making them composable. Suppose you need to determine the day of the week for a given date, for example:

```
{"$dayOfWeek": ISODate("2021-04-24T00:00:00Z")}
```
Here the `$dayOfWeek` Operator expression can only return an element of type _Number_ and takes a single parameter, an element of type _DateTime_. However, rather than using a hardcoded date-time for the parameter, you could have provided an expression. This could be a _Field Path_ expression, for example:

```
{"$dayOfWeek": "$person_details.data_of_birth"}
```

Alternatively, you could have defined the parameter using a _Context System Variable_ expression, for example:

```
{"$dayOfWeek": "$$NOW"}
```

Or you could even have defined the parameter using yet another _Operator_ expression, for example: 

```
{"$dayOfWeek": {"$dateFromParts": {"year" : 2021, "month" : 4, "day": 24}}}
```

Furthermore, you could have defined `year`, `month` and `day` parameters for `$dateFromParts` to be dynamically generated using expressions rather than literal values. The ability to chain expressions together in this way gives your pipelines a lot of power and flexibility when you need it. 


## Can All Stages Use Expressions?

The following question is something you may not have asked yourself before, but asking this question and considering why the answer is what it is can help reveal more about what aggregation expressions are and why you use them.

__Question:__ Can aggregation expressions be used within any type of pipeline stage?

__Answer:__ No

There are many types of stages in the Aggregation Framework that don't allow expressions to be embedded. Examples of some of the most commonly used of these stages are:

 * `$match`
 * `$limit`
 * `$skip`
 * `$sort`
 * `$count`
 * `$lookup`
 * `$out`

Some of these stages may be a surprise to you if you've never really thought about it before. You might well consider `$match` to be the most surprising item in this list. The content of a `$match` stage is just a set of query conditions with the same syntax as MQL rather than an aggregation expression. There is a good reason for this. The aggregation engine reuses the MQL query engine to perform a "regular" query against the collection, enabling the query engine to use all its usual optimisations. The query conditions are taken as-is from the `$match` stage at the top of the pipeline. Therefore, the `$match` filter must use the same syntax as MQL. 

In most of the stages that are unable to leverage expressions, it doesn't usually make sense for their behaviour to be dynamic, based on the pipeline data entering the stage. For a client application that paginates results, you might define a value of `20` for the `$limit` stage. However, maybe you want to dynamically bind a value to the `$limit` stage, sourced by a `$lookup` stage earlier in the pipeline. The lookup operation might pull in the user's preferred "page list size" value from a "user preferences" collection. Nonetheless, the Aggregation Framework does not support this today for the listed stage types to avoid the overhead of the extra checks it would need to perform for what are essentially rare cases.

In most cases, only one of the listed stages needs to be more expressive: the `$match` stage, but this stage is already flexible by being based on MQL query conditions. However, sometimes, even MQL isn't expressive enough to sufficiently define a rule to identify records to retain in an aggregation. The remainder of this chapter explores these challenges and how they are solved.


## What Is Using `$expr` Inside `$match` All About?

The previously stated generalisation about `$match` not supporting expressions is actually inaccurate. Version 3.6 of MongoDB introduced the [`$expr`](https://docs.mongodb.com/manual/reference/operator/query/expr/) operator, which you can embed within a `$match` stage (or in MQL) to leverage aggregation expressions when filtering records. Essentially, this enables MongoDB's query runtime (which executes an aggregation's `$match`) to reuse expressions provided by MongoDB's aggregation runtime.

Inside a `$expr` operator, you can include any composite expression fashioned from `$` operator functions, `$` field paths and `$$` variables. A few situations demand having to use `$expr` from inside a `$match` stage. Examples include:

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


### Restrictions When Using Expressions with `$match`

You should be aware that there are restrictions on when the runtime can benefit from an index when using a `$expr` operator inside a `$match` stage. This partly depends on the version of MongoDB you are running. Using `$expr`, you can leverage a `$eq` comparison operator with some constraints, including an inability to use a [multi-key index](https://docs.mongodb.com/manual/core/index-multikey/). For MongoDB versions before 5.0, if you use a "range" comparison operator (`$gt`, `$gte`, `$lt` and `$lte`), an index cannot be employed to match the field, but this works fine in version 5.0 and greater.

There are also subtle differences when ordering values for a specific field across multiple documents when some values have different types. MongoDB's query runtime (which executes regular MQL and `$match` filters) and MongoDB's aggregation runtime (which implements `$expr`) can apply different ordering rules when filtering, referred to as "type bracketing". Consequently, a range query may not yield the same result with `$expr` as it does with MQL if some values have different types.

Due to the potential challenges outlined, only use a `$expr` operator in a `$match` stage if there is no other way of assembling the filter criteria using regular MQL syntax.

