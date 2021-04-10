# Pipeline Performance Considerations

Similar to any programming language, there is a downside if you prematurely optimise an aggregation pipeline. You risk producing an over-complicated solution that doesn't address the performance challenges that will manifest. As described in the previous chapter, [Using Explain Plans](./explain.md), the tool you should use to identify opportunities for optimisation is the _explain plan_. You will typically use the explain plan during the final stages of your pipeline's development once it is functionally correct.

With all that said, it can still help you to be aware of some guiding principles regarding performance whilst you are prototyping a pipeline. Critically, such guiding principles will be invaluable to you once the aggregation's explain plan is analysed and if it shows that the current pipeline is sub-optimal.

This chapter outlines three crucial tips to assist you when creating and tuning an aggregation pipeline. For sizable data sets, adopting these principles may mean the difference between aggregations completing in a few seconds versus minutes, hours or even longer.


## 1. Be Cognizant Of Streaming Vs Blocking Stages Ordering

When executing an aggregation pipeline, the database engine pulls batches of records from the initial query cursor generated against the source collection. The database engine then attempts to stream each batch through the aggregation pipeline stages. For most types of stages, referred to as _streaming stages_, the database engine will take the processed batch from one stage and immediately stream it into the next part of the pipeline. It will do this without waiting for all the other batches to arrive at the prior stage. However, two types of stages must block and wait for all batches to arrive and accumulate together at that stage. These two stages are referred to as _blocking stages_ and specifically, the two types of stages that block are:

 * `$sort`
 * `$group` *
 
> \* _actually when stating `$group`, this also includes other less frequently used 'grouping' stages too, specifically:_`$bucket`, `$bucketAuto`, `$facet`, `$count` & `$sortByCount`

The diagram below highlights the nature of streaming and blocking stages. Streaming stages allow batches to be processed and then passed through without waiting. Blocking stages wait for the whole of the input data set to arrive and accumulate before processing all this data together.

![Streaming Vs Blocking](./pics/streaming-blocking.png)

When considering `$sort` and `$group` stages, it becomes evident why they have to block. The following examples illustrate why this is the case:

 1. __$sort blocking example__: A pipeline must sort _people_ in ascending order of _age_. If the stage only sorts each batch's content before passing the batch on to the pipeline's result, only individual batches of output records are sorted by age but not the whole result set. 
  
 2. __$group blocking example__: A pipeline must group _employees_ by one of two _work departments_ (either the _sales_ or _manufacturing_ departments). If the stage only groups employees for a batch, before passing it on, the final result contains the work departments repeated multiple times. Each duplicate department consists of some but not all of its employees. 

These usually unavoidable blocking stages don't just increase aggregation execution time by reducing concurrency. The throughput and latency of the pipeline slow dramatically due to significantly increased memory consumption:

 1. __$sort memory consumption__: For a `$sort` stage to see all the input records at once, the host server must have enough capacity to hold all the input data in memory. The amount of memory required depends heavily on the initial data size and the degree to which the prior stages can reduce the size. Also, multiple instances of the aggregation pipeline may be in-flight at any one time, in addition to other database workloads. These all compete for the same finite memory. Suppose the source data set is many gigabytes or even terabytes in size, and earlier pipeline stages have not reduced this size significantly. It will be unlikely that the host machine has sufficient memory to support the pipeline's blocking `$sort` stage. Therefore, MongoDB enforces every `$stage` is limited to 100 MB of consumed RAM. The database throws an error if it exceeds this limit. To avoid this obstacle, you can set the `allowDiskUse=true` option for the overall aggregation for handling large data sets. Consequently, the pipeline's _sort_ operation spills to disk if required, and the 100 MB limit no longer constrains the pipeline. However, the sacrifice here is significantly higher latency, and the execution time is likely to increase by orders of magnitude. There is a situation, though, where you can mitigate this. If the `$sort` stage does not have a `$unwind`, `$group` or `$project` stage preceding it, the stage can take advantage of an index for sorting. The aggregation does not have to manifest the whole data set in memory or overspill to disk.
  
 2. __$group memory consumption__: The `$group` stage has the potential to consume even more memory than a `$sort` operation. This will occur if the stage attempts to group every record and retain all the data. The output will be larger because new groupings 'metadata' is also retained. Referring to the previous example of _people_ records, the `$group` stage's output size will be the size of all the people records plus the new _departments_ grouping metadata. As with the `$sort` stage, an aggregation pipeline's 100 MB RAM limit equally applies for the `$group` stage. You can use the pipeline's `allowDiskUse=true` option to avoid this limit, but with the same downsides. In practicality, though, many grouping scenarios are focussed on grouping summary data, not itemised data. In these situations, considerably reduced result data sets are produced, requiring far less memory than a `$sort` stage.  Let's consider the employees belonging to departments scenario again. An aggregation may require each _department_ group to contain a total employees count, instead of individual employee records, by using an [accumulator operator](https://docs.mongodb.com/manual/reference/operator/aggregation/group/#accumulators-group). So in reality, contrary to sort operations, group operations will typically require a fraction of the host's RAM.

In summary, you should attempt to move `$sort` & `$group` blocking stages to as late as possible in your pipeline. Ideally, earlier stages will significantly reduce the number of records streaming into these blocking stages. The blocking stages will have fewer records to process and less thirst for RAM, and aggregations will complete quickly. The principle exception to this advice is if a `$sort` can take advantage of an index, in which case you want this to occur near the start of the pipeline.


## 2. Avoid Unwinding & Regrouping Documents Just To Process Array Elements

Sometimes, you need an aggregation pipeline to mutate or reduce an array field's content for each record. For example:

 * You may need to add together all the values in the array into a total field
 * You may need to retain the first and last elements of the array only
 * You may need to retain only one reoccurring field for each sub-document in the array 
 * ..._or numerous other array 'reduction' scenarios_

To bring this to life more, imagine a `product_orders` collection. Each document represents a product and contains an array of orders for that product, as shown in the example below:

```javascript
[
  {
    name: "Asus Laptop",
    orders: [
      {
        customer_id: "elise_smith@myemail.com",
        orderdate: 2020-05-30T08:35:52.000Z,
        value: Decimal128("431.43")
      },
      {
        customer_id: "jjones@tepidmail.com",
        orderdate: 2020-12-26T08:55:46.000Z,
        value: Decimal128("429.65")
      }
    ]
  },
  {
    name: "Morphy Richards Food Mixer",
    orders: [
      {
        customer_id: "oranieri@warmmail.com",
        orderdate: 2020-01-01T08:25:37.000Z,
        value: Decimal128("63.13")
      }
    ]
  }
]
```

An aggregation is required to transform these documents to retain the `customer_id` in each order for each product but exclude the `orderdate` and `value` fields because they are surplus to requirements. The desired aggregation output might be:

```javascript
[
  {
    name: "Asus Laptop",
    orders: ["elise_smith@myemail.com", "jjones@tepidmail.com"]
  },
  {
    name: "Morphy Richards Food Mixer",
    orders: ["oranieri@warmmail.com"]
  }
]
```

One obvious way of achieving this transformation is to _unwind_ the _orders_ array for each record. This produces an intermediate set of individual order records that are then _grouped_ together again by the product's `$name`. When re-grouping, only the `customer_id` field is pushed back into the `orders` array with the `orderdate` and `value` fields ignored.  The required pipeline to achieve this is below:

```javascript
// SUBOPTIMAL

var pipeline = [
  {"$unwind": {
    "path": "$orders",
  }},

  {"$group": {
    "_id": "$name",
    "orders": {"$push": "$orders.customer_id"},
  }},
];

```

This pipeline is suboptimal because a `$group` stage has been introduced, which is a blocking stage, as outlined earlier in this chapter. Both memory consumption and execution time will increase significantly, which could be fatal for a large input data set. There is a far better alternative by using one of the [Array Operators](https://docs.mongodb.com/manual/reference/operator/aggregation/#array-expression-operators) instead. Array Operators are sometimes less intuitive to code, but they avoid introducing a blocking stage into the pipeline. Consequently, they are significantly more optimal, especially for large data sets. Shown below is a far more efficient pipeline, using the `$map` array operator, rather than the `$unwind/$group` combination, to produce the same outcome:

```javascript
// OPTIMAL

var pipeline = [
  {"$set": {
    "orders": {
      "$map": {
        "input": "$orders",
        "as": "order",
        "in": "$$order.customer_id",
      }
    },    
  }},
];
```

Note an even simpler solution is possible for this trivial example (`{"$set": {"orders": "$orders.customer_id"}}`), but the used approach is worth highlighting to point the way for more complex array transformations.

To reiterate, there should never be the need to use an `$unwind/$group` combination in an aggregation pipeline to transform an array field's elements for each document in isolation. Instead, use _Array Operators_ to avoid introducing a blocking stage. Otherwise, you will suffer a magnitude of increase in execution time when your pipeline handles more than 100MB of in-flight data. Adopting this best practice may mean the difference between achieving the required business outcome and abandoning the whole task as unachievable.

The primary use of an `$unwind/$group` combination is to correlate patterns across many records rather than transform the content within each input record in isolation. For an illustration of an appropriate use of `$unwind/$group` refer to this book's [Unpack Array & Group Differently](../examples/simple-examples/unpack-array-group-differently.md) example.


## 3. Encourage Match Filters To Appear Early In The Pipeline

As discussed, the database engine will do its best to optimise the aggregation pipeline at runtime, with a particular focus on attempting to move the `$match` stages to the top of the pipeline. Top-level `$match` content will form part of the filter that the engine first executes as the initial query. The aggregation then has the best chance of leveraging an index. However, it may not always be possible to promote `$match` filters in such a way without changing the meaning and resulting output of an aggregation.

Sometimes, a `$match` stage is defined later in a pipeline to perform a filter on a field that the pipeline computed in an earlier stage. The computed field isn't present in the pipeline's original input collection. Some examples are:

 * A pipeline where a `$group` stage creates a new `total` field based on an [accumulator operator](https://docs.mongodb.com/manual/reference/operator/aggregation/group/#accumulators-group). Later in the pipeline, a `$match` stage filters groups where each group's `total` is greater than `1000`. 
 * A pipeline where a `$set` stage computes a new `total` field value based on adding up all the elements of an array field in each document. Later in the pipeline, a `$match` stage filters documents where the `total` is less than `50`.

At first glance, it may seem like the match on the computed field is irreversibly trapped behind an earlier stage that computed the field's value. Indeed the aggregation engine cannot automatically optimise this further. In some situations, though, there may be a missed opportunity where benficial refactoring is possible by you, the developer.

Take the following trivial example of a collection of _customer order_ documents:

```javascript
[
  {
    customer_id: "elise_smith@myemail.com",
    orderdate: 2020-05-30T08:35:52.000Z,
    value: Decimal128("9999"),
  },
  {
    customer_id: "elise_smith@myemail.com",
    orderdate: 2020-01-13T09:32:07.000Z,
    value: Decimal128("10101"),
  },
]
```

Let's assume the orders are in a _Dollars_ currency, and each `value` field shows the order's value in _cents_. You may have built a pipeline to display all orders where the value is greater than 100 dollars like below:

```javascript
// SUBOPTIMAL

var pipeline = [
  {"$set": {
    "value_dollars": {"$multiply": [0.01, "$value"]}, // Converts cents to dollars
  }},
  
  {"$unset": [
    "_id",
    "value",
  ]},         

  {"$match": {
    "value_dollars": {"$gte": 100},  // Peforms a dollar check
  }},    
];
```

The collection has an index defined for the `value` field (in _cents_). However, the `$match` filter uses a computed field, `value_dollars`. When you view the explain plan, you will see the pipeline does not leverage the index. The `$match` is trapped behind the `$set` stage (which computes the field) and cannot be moved to the pipeline's start. MongoDB's aggregation engine is clever enough to track a field's dependencies across multiple stages in a pipeline. It can establish how far up the pipeline it can promote fields without risking a change in the aggregation's behaviour. In this case, it knows that if it moves the `$match` stage ahead of the `$set` stage, it depends on, things will not work correctly.

In this example, as a developer, you can easily make a pipeline modification that will enable this pipeline to be more optimal without changing the pipeline's intended outcome. Change the `$match` filter to be based on the source field `value` instead (greater than `10000` cents), rather than the computed field (greater than `100` dollars). Also, ensure the `$match` stage appears before the `$unset` stage (which removes the `value` field). This change is enough to allow the pipeline to run efficiently. Below is how the pipeline looks after you have made  this change:

```javascript
// OPTIMAL

var pipeline = [
  {"$set": {
    "value_dollars": {"$multiply": [0.01, "$value"]},
  }},
  
  {"$match": {                // Moved to before the $unset
    "value": {"$gte": 10000},   // Changed to perform a cents check
  }},    

  {"$unset": [
    "_id",
    "value",
  ]},         
];
```

This pipeline produces the same data output. However, when you look at its explain plan, it shows the database engine has pushed the `$match` filter to the top of the pipeline and used an index on the `value` field. The aggregation is now optimal because the `$match` stage is no longer 'blocked' by its dependency on the computed field.

There may be some cases where you can't unravel a computed value in such a manner. However, it may still be possible for you to include an additional `$match` stage, to perform a __partial match__ targeting the aggregation's query cursor. Suppose you have a pipeline that masks the values of sensitive `date_of_birth` fields (replaced with computed `masked_date` fields). The computed field adds a random number of days (one to seven) to each current date. The pipeline already contains a `$match` stage with the filter `masked_date > 01-Jan-2020`. The runtime cannot optimise this to the top of the pipeline due to the dependency on a computed value. Nevertheless, you can manually add an extra `$match` stage at the top of the pipeline, with the filter `date_of_birth > 25-Dec-2020`. This new `$match` leverages an index and filters records seven days earlier than the existing `$match`, but the aggregation's final output is the same. The new `$match` may pass on a few more records than intended. However, later on, the pipeline applies the existing filter `masked_date > 01-Jan-2020` that will naturally remove surviving surplus records before the pipeline completes.

In summary, if you have a pipeline leveraging a `$match` stage and the explain plan shows this is not moving to the start of the pipeline, explore whether manually refactoring will help. If the `$match` filter depends on a computed value, examine if you can alter this or add an extra `$match` to yield a more efficient pipeline.

