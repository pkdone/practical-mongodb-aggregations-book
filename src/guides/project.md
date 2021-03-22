# To Project Or Not To Project, That Is The Question

The quintessential tool in MongoDB's Query Language (MQL) to specify or restrict fields to return in a query result set is a _projection_. In the MongoDB Aggregation Framework, the analogous facility for specifying fields to include or exclude in a result is the [$project](https://docs.mongodb.com/manual/reference/operator/aggregation/project/) stage. For many earlier versions of MongoDB, this was the only tool to define which fields to include and exclude, however it comes with a few usability challenges:

 1. __*$project* is confusing and non-intuitive__. In a single stage you can only choose to include fields or to exclude fields, but not both, with the exception of being able to define the `_id` field to exclude yet define other fields to include. It's as if `$project` has an identity crisis.
 
 2. __*$project* is verbose and inflexible__. If you want to include a new field into each result record (e.g. concatenating values from two other fields together) or include a new value for an existing named field (e.g. convert text to a date), you are then forced to name all other fields in the projection for inclusion. If each record has 100 fields, and you then need to use a `$project` stage for the first time, to include a new 101st field, you also have to name all the 100 fields in the `$project` stage too. This irritation is further compounded if you have an evolving data model, where additional new fields appear in some records over time. Using `$project` for inclusion means each time a new field appears in the data-set, a developer has to go back to the old aggregation pipeline, to modify it to name the new field explicitly for inclusion in the results.

In MongoDB version 4.2, the [$set](https://docs.mongodb.com/manual/reference/operator/aggregation/set/) and [$unset](https://docs.mongodb.com/manual/reference/operator/aggregation/unset/) stages were introduced, which, in most cases, are preferable to using `$project` for declaring field inclusion and exclusion respectively. They make the intent of the code far clearer, they lead to less verbose pipelines and, criticality, they reduce the need to refactor a pipeline whenever the data model evolves. How this works and guidance on when to use `$set` & `$unset` stages is described in the section 'When To Use $set & $unset', below.

Despite the challenges however, there are some specific situations where using `$project` is advantageous over `$set`/`$unset`. This is described in the section 'When To Use $project', below. 

To add to the confusion, in MongoDB 3.4, a first attempt at addressing some of the disadvantages of `$project`_ was made by introducing a new [$addFields](https://docs.mongodb.com/manual/reference/operator/aggregation/addFields/) stage, which has the same exact behaviour as `$set` (`$set` actually came later than `$addFields`). No direct equivalent to `$unset` was provided back then. Now that both `$set` and `$unest` stages are available in modern versions of MongoDB, and because their counter purposes are so obvious to deduce by their names (`$set` Vs `$unset`), __it is recommended to not use *$addFields*__. This helps with consistency and to avoid any confusion of intent. If you have come to MongoDB only recently, just pretend `$addFields` never existed! &#128518;


## When To Use Set & Unset

`$set` & `$unset` stages should be used when most of the fields in the input records should be retained and only a minority subset of fields need to be added, modified or removed. This is the case for the majority of uses of aggregation pipelines.

For example, imagine there is a collection of credit card payment records as documents similar to the following:

```javascript
// INPUT  (a record from the source collection to be operated on by an aggregation)
{
  _id: ObjectId("6044faa70b2c21f8705d8954"),
  card_name: 'Mrs. Jane A. Doe',
  card_num: '1234567890123456',
  card_expiry: '2023-08-31T23:59:59.736Z',
  card_sec_code: '123',
  card_provider_name: 'Credit MasterCard Gold',
  transaction_id: 'eb1bd77836e8713656d9bf2debba8900',
  transaction_date: 2021-01-13T09:32:07.000Z,
  transaction_curncy_code: 'GBP',
  transaction_amount: Decimal128("501.98"),
  reported: true
}
```

Then imagine an aggregation pipeline is required, to produce modified versions of the documents, as shown below:

```javascript
// OUTPUT  (a record in the results of the executed aggregation)
{
  card_name: 'Mrs. Jane A. Doe',
  card_num: '1234567890123456',
  card_expiry: 2023-08-31T23:59:59.736Z,  // Field type converted from text to date
  card_sec_code: '123',
  card_provider_name: 'Credit MasterCard Gold',
  transaction_id: 'eb1bd77836e8713656d9bf2debba8900',
  transaction_date: 2021-01-13T09:32:07.000Z,
  transaction_curncy_code: 'GBP',
  transaction_amount: Decimal128("501.98"),
  reported: true,
  card_type: 'CREDIT'                     // New field added using a literal value
}
```

Here, shown by the `//` comments, there was a requirement to slightly modify the structure of each document, converting the `card_expiry` text field into a proper date field, and adding a new field `card_type` field, set to a value of 'CREDIT', for every record.

Naively you might decide to build an aggregation pipeline using a `$project` stage, to achieve this transformation, which would probably look similar to the following:

```javascript
// BAD
[
  {'$project': {
    // Modify a field + add a new field
    'card_expiry': {'$dateFromString': {'dateString': '$card_expiry'}},
    'card_type': 'CREDIT',        

    // Must now name all the other fields for those fields to be retained
    'card_name': 1,
    'card_num': 1,
    'card_sec_code': 1,
    'card_provider_name': 1,
    'transaction_id': 1,
    'transaction_date': 1,
    'transaction_curncy_code': 1,
    'transaction_amount': 1,
    'reported': 1,                
    
    // Remove _id field
    '_id': 0,
  }},
]
```

As you can see, the pipeline's stage is quite verbose and because a `$project` stage is being used to modify/add two fields, you are forced to also explicitly name each other existing field of the source records, for inclusion, otherwise those fields will be lost during the transformation. Imagine if each payment document has hundreds of possible fields, rather than just ten! 

A better approach to building the aggregation pipeline, to achieve the exact same results, would be to use `$set` and `$unset` instead, as shown below:

```javascript
// GOOD
[
  {'$set': {
    // Modified + new field
    'card_expiry': {'$dateFromString': {'dateString': '$card_expiry'}},
    'card_type': 'CREDIT',        
  }},
  
  {'$unset': [
    // Remove _id field
    '_id',
  ]},
]
```

This time, if some new documents are subsequently added to the existing payments collection, which include additional new fields, e.g. `settlement_date` & `settlement_curncy_code'`, then no changes are required to the aggregation pipeline to allow these new fields to automatically appear in the results of existing aggregation pipelines. However, when using `$project`, each time the possibility of a new field arises, a developer has to first refactor the pipeline to incorporate an additional inclusion declaration (e.g. `'settlement_date': 1`, or `'settlement_curncy_code': 1`)


## When To Use Project

A `$project` stage should be used when the required output shape of result documents is very different than the shape of the input documents, where most of the original fields are not to be included in the output.

This time for the same input payments collection, lets imagine a different aggregation pipeline was required to produce result documents, where each document's structure is required to be very different than the input structure, with far fewer field values needing to be pulled through from the original input documents, similar to the following:

```javascript
// OUTPUT  (a record in the results of the executed aggregation)
{
  transaction_info: { 
    date: 2021-01-13T09:32:07.000Z,
    amount: Decimal128("501.98")
  },
  status: 'REPORTED'
}
```

Now, using `$set`/`$unset` in the pipeline to achieve the above output structure would be verbose and would require naming all the fields (for exclusion this time). as shown below:

```javascript
// BAD
[
  {'$set': {
    'transaction_info.date': '$transaction_date',
    'transaction_info.amount': '$transaction_amount',
    'status': {'$cond': {'if': '$reported', 'then': 'REPORTED', 'else': 'UNREPORTED'}},
  }},
  
  {'$unset': [
    // Remove _id field
    '_id',

    // Must name all existing fields to be omitted
    'card_name',
    'card_num',
    'card_expiry',
    'card_sec_code',
    'card_provider_name',
    'transaction_id',
    'transaction_date',
    'transaction_curncy_code',
    'transaction_amount',
    'reported',         
  ]}, 
]
```

However, by using `$project` for this specific aggregation, as shown below, to achieve the exact same results, the pipeline would be less verbose. The pipeline would have the flexibility of not requiring modification if subsequent additions are ever made to the data model, with new previously unknown fields:

```javascript
// GOOD
[
  {'$project': {
    'transaction_info.date': '$transaction_date',
    'transaction_info.amount': '$transaction_amount',
    'status': {'$cond': {'if': '$reported', 'then': 'REPORTED', 'else': 'UNREPORTED'}},
    
    // Remove _id field
    '_id': 0,
  }},
]
```


## Main Takeaway

In summary, always look to use `$set` & `$unset` for field inclusion and exclusion, rather than `$project`, unless it is very clear that a very different structure is required for result documents, with only a small sub-set of the input fields needing to be retained. Don't bother using `$addFields` nowadays because it adds no value and may just cause confusion.

