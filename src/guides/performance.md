# Pipeline Performance Considerations

There is a downside if you prematurely optimise an aggregation pipeline as with any programming language. You risk producing an over-complicated solution that doesn't address the performance challenges that will manifest. As described in the previous chapter, [Using Explain Plans](./explain.md), the tool you should use to identify opportunities for effective optimisation is the _explain plan_. You will typically use the explain plan during the final stages of your pipeline's development once the pipeline is functionally correct.

With all that said, it can still help you to be aware of some guiding principles regarding performance whilst you are prototyping a pipeline. Critically, such guiding principles will be invaluable to you once the aggregation's explain plan is analysed and if it shows that the current pipeline is sub-optimal.

This chapter outlines three crucial tips to help you when creating and tuning an aggregation pipeline. For sizable data sets, adopting these principles may mean the difference between aggregations completing in a few seconds versus minutes, hours or even longer.


## 1. Be Cognizant Of Streaming Vs Blocking Stages Ordering

When executing an aggregation pipeline, the database engine pulls batches of records from the initial query cursor generated against the source collection. The database engine then attempts to stream each batch through the aggregation pipeline stages. For most types of stages, referred to as _streaming stages_, the database engine will take the processed batch from one stage and immediately stream it into the next part of the pipeline. It will do this without waiting for all the other batches to arrive at the prior stage. However, two types of stages must block and wait for all batches' records to arrive and accumulate together at that stage. These two stages are referred to as _blocking stages_ and specifically, the two types of stages that block are:

 * `$sort`
 * `$group` *
 
> \* _actually when stating `$group`, this also includes other less frequently used 'grouping' stages too, specifically:_`$bucket`, `$bucketAuto`, `$facet`, `$count` & `$sortByCount`

The diagram below highlights the nature of streaming and blocking stages. Streaming stages allow batches to be processed and then passed through without waiting. Blocking stages wait for the whole of the input data set to arrive and accumulate before processing all this data together.

![Streaming Vs Blocking](./pics/streaming-blocking.png)

When considering `$sort` and `$group` stages, it becomes evident why they have to block. The following examples illustrate why this is the case:

 1. __$sort blocking example__: A pipeline must sort _people_ in ascending order of _age_. If the stage only sorts each batch's content before passing the batch on to the pipeline's result, only individual subsets of output records are sorted by age and not the whole result set. 
  
 2. __$group blocking example__: A pipeline must group _employees_ by one of two _work departments_ (either _sales_ or _manufacturing_). If the stage only groups employees for a batch, before passing it on, the final result contains the same work departments repeated multiple times. Each duplicate department consists of some but not all of its employees. 

These unavoidable blocking stages don't just increase aggregation execution time by reducing concurrency. The throughput and latency of the pipeline slow dramatically due to significantly increased memory consumption:

 1. __$sort memory consumption__: For a `$sort` stage to see all the input records at once, the host server must have enough capacity to hold all the input data in memory. The amount of memory required is heavily dependent on the initial data size and how far the prior stages can reduce the size. Also, multiple instances of the aggregation pipeline may be in-flight at any one time, in addition to other database workloads. These all compete for the same finite memory. Suppose the source data-set is many gigabytes or even terabytes in size, and earlier pipeline stages have not reduced this size significantly. It will be unlikely that the host machines will have sufficient memory to support the pipeline's blocking `$sort` stage. Therefore, MongoDB enforces every `$stage` is limited to 100 MB of consumed RAM. The database throws an error if it exceeds this limit. To avoid this problem, you can set the `allowDiskUse=true` option for the overall aggregation for handling large data sets. Consequently, the pipeline's _sort_ operation spills to disk if required, and the 100 MB limit no longer constrains the pipeline. However, the sacrifice here is significantly higher latency, and the execution time is likely to increase by orders of magnitude. There is one situation, however, where you can mitigate this. If the `$sort` stage does not have a `$project`, `$unwind` or `$group` stage preceding it, the stage can take advantage of an index for sorting. It does not have to manifest the whole data set in memory or overspill to disk.
  
 2. __$group memory consumption__: The `$group` stage has the potential to consume even more memory than a `$sort` operation. This will occur if the stage attempts to group every record and retain all the data. The output will be larger because new groupings 'metadata' is also retained. Referring to the previous example of _people_ records, the `$group` stage's output size will be the size of all the people records plus the new _departments_ grouping metadata. As with the `$sort` stage, an aggregation pipeline's 100 MB RAM limit equally applies for the `$group` stage. You can use the pipeline's `allowDiskUse=true` option to avoid this limit, but with the same downsides. In practicality, though, many grouping scenarios are focussed on grouping summary data, not itemised data. In these situations, considerably reduced summary data sets are produced, requiring far less memory than a `$sort` stage.  Let's consider the employees belonging to departments scenario again. An aggregation may require each _department_ group to contain a total employees count instead of individual employee records using an [accumulator operator](https://docs.mongodb.com/manual/reference/operator/aggregation/group/#accumulators-group). Contrary to sort operations, group operations will typically require a fraction of the host's RAM.

In summary, you should attempt to move `$sort` & `$group` blocking stages to as late as possible in your pipeline. Ideally, earlier stages will significantly reduce the number of records streaming into these blocking stages. The blocking stages will have fewer records to process and less thirst for RAM, and aggregation will complete quickly.


## 2. Avoid Unwinding & Regrouping Documents Just To Process Each Record's Array Elements

Sometimes, you need an aggregation pipeline to mutate or reduce an array field's content for each record. For example:

 * You may need to add together all the values in the array into a total field
 * You may need to retain the first and last elements of the array only
 * You may need to retain only one field of each sub-document in the array 
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

There should never be the need to use an `$unwind/$group` combination in an aggregation pipeline to transform an array field's elements for each document in isolation. Instead, use _Array Operators_ to avoid introducing a blocking stage. Otherwise, you will suffer a magnitude of increase in execution time when your pipeline handles more than 100MB of in-flight data. Adopting this best practice may mean the difference between achieving the required business outcome and abandoning the whole task as unachievable.

In summary, the primary use of an `$unwind/$group` combination is to correlate patterns across many records rather than transform the content within each input record in isolation. For an illustration of an appropriate use of `$unwind/$group` refer to this book's [Unpack Array & Group Differently](../simple-examples/unpack-array-group-differently.md) example.


## 3. Encourage Match Filters To Appear Early In A Pipeline

As discussed in this book's [Using Explain Plans](./explain.md) chapter, the database engine will do its best to optimise the aggregation pipeline at runtime, with a particular focus on moving the `$match` stage contents to the top of the pipeline, if possible, to form part of the filters that are first executed as a query by the aggregation. This helps to maximise the opportunity for an index to be optimally leveraged at the start of the aggregation. However, it may not always be possible to promote `$match` filters in such a way without changing the meaning and resulting output of an aggregation.

Sometimes there are situations where a `$match` stage is defined later in a pipeline and is performing a filter on a field which was only computed part way into the pipeline and therefore wasn't present in the source collection that the aggregation operated on. For example, perhaps a `$group` stage creates a new `total` field based on an accumulator and then a `$match` stage looks for records where the `total` is greater than `1000`. Or perhaps a `$set`stage computes a new  `total` field value based on adding up all the elements of an array field in the same document, and the `$match` then looks for records where the `total` is less than `50`.

At first glance, it may seem like nothing can be further done to optimise the pipeline by promoting the position of a specific `$match` stage. Sometimes that will indeed be the reality. In other situations though, there may be a missed opportunity where a refactoring is actually possible to enable such an optimisation.

Take the following trivial example of a collection of _customer orders_ documents:


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

Let's assume the orders are based on a _Dollars_ currency, and each `value` field shows the order's value in _cents_. A pipeline may have been built to show all orders where the value is greater than 100 dollars like below:

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

Although the collection has an index defined for the `value` field (which is in _cents_), the `$match` filter for this pipeline is based on a computed field, `value_dollars` and hence if you run the explain plan for the this aggregation you will see that the `$match` filter has not been pushed to the top of the pipeline and an index has not been leveraged. The `$match` stage's filtering on `value_dollars` can at best only by pushed upwards to just after the `$set` stage, at runtime by the aggregation engine. It can't be pushed to the start of the pipeline. MongoDB's aggregation engine is clever enough to track dependencies for a particular field which is referenced in multiple stages in a pipeline. Hence it is able to establish how far up the pipeline it can promote fields without risking a change in the external behaviour and outcome of the aggregation. In this case it knows that the `$match` stage cannot be pushed ahead of the `set` stage which it depends on.

By now for this example, it is probably obvious that as a developer you can easily make a pipeline modification that will enable this pipeline to be optimised, without changing the intended outcome of the pipeline. For this pipeline, simply by changing the `$match` filter to be based on the source field `value` being greater than `10000` cents, rather than the computed field `value_dollars` being greater then `100` dollars, and ensuring the `$match` stage appears before the `$unset` stage (which would remove the `value` field) it is enough to allow the pipeline run efficiently. Below is the pipeline after being manually optimised by the developer:

```javascript
// OPTIMAL

var pipeline = [
  {"$set": {
    "value_dollars": {"$multiply": [0.01, "$value"]},
  }},
  
  {"$match": {                // Moved to before the $unset
    "value": {"$gte": 10000},   // Changed to not perform a cents check
  }},    

  {"$unset": [
    "_id",
    "value",
  ]},         
];
```

This pipeline produces the exact same results but if you were to look at its explain plan you would now see that the `$match` filter has been pushed to the top of the pipeline, when executed, and the index on `value` is now being leveraged. For completeness, in this case, the developer might as well move the modified `$match` stage to be the first stage in the pipeline explicitly, but this wasn't mandatory, as can be seen by the explain plan. The aggregation runtime has now been able to perform that optimisation itself because the `$match` stage is no longer 'blocked' by a dependency on a computed field dependency.

There may be some cases where it isn't possible to unravel a computed value in such a way entirely. However, it may still be possible to include an additional `$match` stage, to perform a _partial match_, earlier in the pipeline. For example, lets say a computed field masks a sensitive `date_of_birth` field into a new `masked date` field by adding a random few days to the date, up to a maximum of 7 days. An existing `$match` stage's filter in the pipeline might already have been defined to only include records where `masked date` is greater than `01-Jan-2020`. A manual refactoring optimisation could be made to include an additional `$match`. This extra `$match` would be placed right at the start of the pipeline, with the filter `date_of_birth > 25-Dec-2020`, 7 days before the existing `$match` filter present later in the pipeline. This doesn't mean that the output of the overall aggregation has changed, with potentially more records being output. The output will not change because the original `$match` stage still exists in the pipeline to catch any _stragglers_. Now, earlier in pipeline however, there is a new _partially effective_ filter, which is leveraging an index, and which won't necessarily filter out all undesired records, but will quickly filter out the vast majority of them, leaving any errant records from the remaining 7 days window of time to be filtered out as normal, later in the pipeline.

In summary, if you have a pipeline leveraging a `$match` stage and the explain plan shows the pipeline is not being optimised to promote the `$match` filter to be at the start of the pipeline, explore whether the match filter is based on a computed field, from say a `$group` or `$set` stage. If it is, see if the filter of the `$match` can be fully or partly _unravelled_ and based on a source field's value instead.

