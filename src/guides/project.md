# Better Alternatives To A Project Stage

The quintessential tool used in MongoDB's Query Language (MQL) to define or restrict fields to return is a _projection_. In the MongoDB Aggregation Framework, the analogous facility for specifying fields to include or exclude is the [$project](https://docs.mongodb.com/manual/reference/operator/aggregation/project/) stage. For many earlier versions of MongoDB, this was the only tool to define which fields to keep or omit. However, `$project` comes with a few usability challenges: 

 1. __*$project* is confusing and non-intuitive__. You can only choose to include fields or exclude fields in a single stage, but not both. There is one exception, though, where you can exclude the _id field yet still define other fields to include (note, this only applies to the _id field). It's as if $project has an identity crisis.

 2. __*$project* is verbose and inflexible__. If you want to define one new field or revise one field, you will have to name all other fields in the projection to include. If each input record has 100 fields and the pipeline needs to employ a `$project` stage for the first time, things become tiresome. To include a new 101st field, you now also have to name all the original 100 fields in this new `$project` stage too. You will find this irritating if you have an evolving data model, where additional new fields appear in some records over time. Because you use a `$project` for inclusion, then each time a new field appears in the data set, you must go back to the old aggregation pipeline to modify it to name the new field explicitly for inclusion in the results. This is the antithesis of flexibility and agility.

In MongoDB version 4.2, the [$set](https://docs.mongodb.com/manual/reference/operator/aggregation/set/) and [$unset](https://docs.mongodb.com/manual/reference/operator/aggregation/unset/) stages were introduced, which, in most cases, are preferable to using `$project` for declaring field inclusion and exclusion. They make the code's intent much clearer, lead to less verbose pipelines, and, criticality, they reduce the need to refactor a pipeline whenever the data model evolves. How this works and guidance on when to use `$set` & `$unset` stages is described in the section '_When To Use $set & $unset_', further below.

Despite the challenges, though, there are some specific situations where using `$project` is advantageous over `$set`/`$unset`. These situations are described in the section '_When To Use $project_' further below. 

To add to the confusion, in MongoDB 3.4, a first attempt at addressing some of the disadvantages of `$project` was made by introducing a new [$addFields](https://docs.mongodb.com/manual/reference/operator/aggregation/addFields/) stage, which has the same behaviour as `$set` (`$set` came later than `$addFields`). The Aggregation Framework provided no direct equivalent to `$unset` back then. However, both `$set` and `$unest` stages are available in modern versions of MongoDB, and their counter purposes are obvious to deduce by their names (`$set` Vs `$unset`). The name `$addFields` also does not reflect that you can modify existing fields rather than just add new fields. Therefore, nowadays, you should not use `$addFields`. This helps with consistency and avoids any confusion of intent. If you have come to MongoDB only recently, pretend `$addFields` never existed!


## When To Use Set & Unset

You should use `$set` & `$unset` stages when you need to retain most of the fields in the input records, and you want to add, modify or remove a minority subset of fields. This is the case for most uses of aggregation pipelines.

For example, imagine there is a collection of credit card payment documents similar to the following:

```javascript
// INPUT  (a record from the source collection to be operated on by an aggregation)
{
  _id: ObjectId("6044faa70b2c21f8705d8954"),
  card_name: "Mrs. Jane A. Doe",
  card_num: "1234567890123456",
  card_expiry: "2023-08-31T23:59:59.736Z",
  card_sec_code: "123",
  card_provider_name: "Credit MasterCard Gold",
  transaction_id: "eb1bd77836e8713656d9bf2debba8900",
  transaction_date: 2021-01-13T09:32:07.000Z,
  transaction_curncy_code: "GBP",
  transaction_amount: Decimal128("501.98"),
  reported: true
}
```

Then imagine an aggregation pipeline is required to produce modified versions of the documents, as shown below:

```javascript
// OUTPUT  (a record in the results of the executed aggregation)
{
  card_name: "Mrs. Jane A. Doe",
  card_num: "1234567890123456",
  card_expiry: 2023-08-31T23:59:59.736Z,  // Field type converted from text to date
  card_sec_code: "123",
  card_provider_name: "Credit MasterCard Gold",
  transaction_id: "eb1bd77836e8713656d9bf2debba8900",
  transaction_date: 2021-01-13T09:32:07.000Z,
  transaction_curncy_code: "GBP",
  transaction_amount: Decimal128("501.98"),
  reported: true,
  card_type: "CREDIT"                     // New field added using a literal value
}
```

Here, shown by the `//` comments, there was a requirement to modify each document's structure slightly, to convert the `card_expiry` text field into a proper date field, and add a new `card_type` field, set to the value 'CREDIT', for every record.

Naively you might decide to build an aggregation pipeline using a `$project` stage to achieve this transformation, which would probably look similar to the following:

```javascript
// BAD
[
  {"$project": {
    // Modify a field + add a new field
    "card_expiry": {"$dateFromString": {"dateString": "$card_expiry"}},
    "card_type": "CREDIT",        

    // Must now name all the other fields for those fields to be retained
    "card_name": 1,
    "card_num": 1,
    "card_sec_code": 1,
    "card_provider_name": 1,
    "transaction_id": 1,
    "transaction_date": 1,
    "transaction_curncy_code": 1,
    "transaction_amount": 1,
    "reported": 1,                
    
    // Remove _id field
    "_id": 0,
  }},
]
```

As you can see, the pipeline's stage is quite lengthy, and because you use a `$project` stage to modify/add two fields, you must also explicitly name each other existing field from the source records for inclusion. Otherwise, you will lose those fields during the transformation. Imagine if each payment document has hundreds of possible fields, rather than just ten!

A better approach to building the aggregation pipeline, to achieve the same results, would be to use `$set` and `$unset` instead, as shown below:

```javascript
// GOOD
[
  {"$set": {
    // Modified + new field
    "card_expiry": {"$dateFromString": {"dateString": "$card_expiry"}},
    "card_type": "CREDIT",        
  }},
  
  {"$unset": [
    // Remove _id field
    "_id",
  ]},
]
```

This time, when you need to add new documents to the collection of existing payments, which include additional new fields, e.g. `settlement_date` & `settlement_curncy_code`, no changes are required. The existing aggregation pipeline allows these new fields to appear in the results automatically. However, when using `$project`, each time the possibility of a new field arises, a developer must first refactor the pipeline to incorporate an additional inclusion declaration (e.g. `"settlement_date": 1`, or `"settlement_curncy_code": 1`).


## When To Use Project

It is best to use a `$project` stage when the required shape of output documents is very different from the input documents' shape. This situation often arises when you do not need to include most of the original fields.

This time for the same input payments collection, let us imagine you require a different aggregation pipeline to produce result documents. You need each output document's structure to be very different from the input structure, and you need to retain far fewer original fields, similar to the following:

```javascript
// OUTPUT  (a record in the results of the executed aggregation)
{
  transaction_info: { 
    date: 2021-01-13T09:32:07.000Z,
    amount: Decimal128("501.98")
  },
  status: "REPORTED"
}
```

Using `$set`/`$unset` in the pipeline to achieve this output structure would be verbose and would require naming all the fields (for exclusion this time), as shown below:

```javascript
// BAD
[
  {"$set": {
    // Add some field  
    "transaction_info.date": "$transaction_date",
    "transaction_info.amount": "$transaction_amount",
    "status": {"$cond": {"if": "$reported", "then": "REPORTED", "else": "UNREPORTED"}},
  }},
  
  {"$unset": [
    // Remove _id field
    "_id",

    // Must name all existing fields to be omitted
    "card_name",
    "card_num",
    "card_expiry",
    "card_sec_code",
    "card_provider_name",
    "transaction_id",
    "transaction_date",
    "transaction_curncy_code",
    "transaction_amount",
    "reported",         
  ]}, 
]
```

However, by using `$project` for this specific aggregation, as shown below, to achieve the same results, the pipeline will be less verbose. The pipeline will have the flexibility of not requiring modification if you ever make subsequent additions to the data model, with new previously unknown fields:

```javascript
// GOOD
[
  {"$project": {
    // Add some field  
    "transaction_info.date": "$transaction_date",
    "transaction_info.amount": "$transaction_amount",
    "status": {"$cond": {"if": "$reported", "then": "REPORTED", "else": "UNREPORTED"}},
    
    // Remove _id field
    "_id": 0,
  }},
]
```


## Main Takeaway

In summary, you should always look to use `$set` & `$unset` for field inclusion and exclusion, rather than `$project`. The main exception is if you have an obvious requirement for a very different structure for result documents, where you only need to retain a small subset of the input fields. Unless you are already wedded to it, don't bother using `$addFields` because it adds no value and may cause confusion.

