# Mask Sensitive Fields

__Minimum MongoDB Version:__ 4.4 &nbsp;&nbsp; _(due to use of [$rand](https://docs.mongodb.com/manual/reference/operator/aggregation/rand/) operator)_


## Scenario

A user wants to perform irreversible masking on the sensitive fields of a collection of documents, in some cases obfuscating part of a field's value, in other cases adjusting a field's value by a small random amount, in some cases substituting the field's value with a completely random value and in some cases excluding a field from the result completely, depending on a field's value.

In this example, a collection of _credit card payment_ documents will be masked, to:
 * Partially obfuscate the carder holder's name
 * Obfuscate the first 12 digits of the card's number, retaining only the final 4 digits
 * Adjust the card's expiry date-time by adding or subtracting a random amount up to a maximum of 30 days (~1 month)
 * Replace the card's 3 digit security code with a random set of 3 digits
 * Adjust the transaction's amount by adding or subtracting a random amount up to a maximum of 10% of the original amount
 * Change the transaction's `reported` field boolean value to the opposite value, for roughly 20% of the records
 * If the embedded `customer_info` sub-document's `category` field is set to _SENSITIVE_, exclude the whole `customer_info` sub-document

## Sample Data Population

Drop the old version of the database (if it exists) and then populate a new `payments` collection with 2 credit card payment documents, containing sensitive data:

```javascript
use mask-sensitive-fields;
db.dropDatabase();

// Insert 2 records into the payments collection
db.payments.insertMany([
    {
        'card_name': 'Mrs. Jane A. Doe',
        'card_num': '1234567890123456',
        'card_expiry': ISODate('2023-08-31T23:59:59Z'),
        'card_sec_code': '123',
        'card_type': 'CREDIT',        
        'transaction_id': 'eb1bd77836e8713656d9bf2debba8900',
        'transaction_date': ISODate('2021-01-13T09:32:07Z'),
        'transaction_amount': NumberDecimal('501.98'),
        'reported': false,
        'customer_info': {
            'category': 'SENSITIVE',
            'rating': 89,
            'risk': 3,
        },
    },
    {
        'card_name': 'Jim Smith',
        'card_num': '9876543210987654',
        'card_expiry': ISODate('2022-12-31T23:59:59Z'),
        'card_sec_code': '987',
        'card_type': 'DEBIT',        
        'transaction_id': '634c416a6fbcf060bb0ba90c4ad94f60',
        'transaction_date': ISODate('2020-11-24T19:25:57Z'),
        'transaction_amount': NumberDecimal('64.01'),
        'reported': true,
        'customer_info': {
            'category': 'NORMAL',
            'rating': 78,
            'risk': 55,
        },
    },
]);
```


## Aggregation Pipeline(s)

Define a single pipeline ready to perform the aggregation:

```javascript
var pipeline = [
  // Replace a subset of fields with new values
  {'$set': {
    // Extract the last word from the name , eg: 'Doe' from 'Mrs. Jane A. Doe'
    'card_name': {'$regexFind': {'input': '$card_name', 'regex': /(\S+)$/}},
          
    // Mask card num 1st part retaining last 4 chars, eg: '1234567890123456' -> 'XXXXXXXXXXXX3456'
    'card_num': {'$concat': [
                  'XXXXXXXXXXXX',
                  {'$substrCP': ['$card_num', 12, 4]},
                ]},                     

    // Add/subtract a random time amount of a maximum of 30 days (~1 month) each-way
    'card_expiry': {'$add': [
                     '$card_expiry',
                     {'$floor': {'$multiply': [{'$subtract': [{'$rand': {}}, 0.5]}, 2*30*24*60*60*1000]}},
                   ]},                     

    // Replace each digit with random digit, eg: '133' -> '472'
    'card_sec_code': {'$concat': [
                       {'$toString': {'$floor': {'$multiply': [{'$rand': {}}, 10]}}},
                       {'$toString': {'$floor': {'$multiply': [{'$rand': {}}, 10]}}},
                       {'$toString': {'$floor': {'$multiply': [{'$rand': {}}, 10]}}},
                     ]},
                     
    // Add/subtract a random percent of the amount's value up to 10% maximum each-way
    'transaction_amount': {'$add': [
                            '$transaction_amount',
                            {'$multiply': [{'$subtract': [{'$rand': {}}, 0.5]}, 0.2, '$transaction_amount']},
                          ]},
                          
    // Retain field's bool value 80% of time on average, setting to the opposite value 20% of time
    'reported': {'$cond': {
                   'if':   {'$lte': [{'$rand': {}}, 0.8]},
                   'then': '$reported',
                   'else': {'$not': ['$reported']},
                }},      

    // Exclude sub-doc if the sub-doc's category field's value is 'SENSITIVE'
    'customer_info': {'$cond': {
                        'if':   {'$eq': ['$customer_info.category', 'SENSITIVE']}, 
                        'then': '$$REMOVE',     
                        'else': '$customer_info',
                     }},                                         
                
    // Mark _id field to excluded from results
    '_id': '$$REMOVE',                
  }},
  
  // Take regex matched last word from the card name and prefix it with hardcoded value
  {'$set': {
    'card_name': {'$concat': ['Mx. Xxx ', {'$ifNull': ['$card_name.match', 'Anonymous']}]},                       
  }},
];
```


## Execution

Execute the aggregation using the defined pipeline and also view its explain plan:

```javascript
db.payments.aggregate(pipeline);
```

```javascript
db.payments.explain('executionStats').aggregate(pipeline);
```


## Expected Results

Two documents should be returned, corresponding to the original two source documents, but this time with many of their fields redacted and obfuscated, plus the `customer_info` embedded document omitted for one record due to it having been marked as `sensitive`, as shown below:

```javascript
[
  {
    card_name: 'Mx. Xxx Doe',
    card_num: 'XXXXXXXXXXXX3456',
    card_expiry: 2023-08-31T23:29:46.460Z,
    card_sec_code: '295',
    card_type: 'CREDIT',
    transaction_id: 'eb1bd77836e8713656d9bf2debba8900',
    transaction_date: 2021-01-13T09:32:07.000Z,
    transaction_amount: Decimal128("492.4016988351474881660000000000000"),
    reported: false
  },
  {
    card_name: 'Mx. Xxx Smith',
    card_num: 'XXXXXXXXXXXX7654',
    card_expiry: 2023-01-01T00:34:49.330Z,
    card_sec_code: '437',
    card_type: 'DEBIT',
    transaction_id: '634c416a6fbcf060bb0ba90c4ad94f60',
    transaction_date: 2020-11-24T19:25:57.000Z,
    transaction_amount: Decimal128("58.36081337486762223600000000000000"),
    reported: false,
    customer_info: { category: 'NORMAL', rating: 78, risk: 55 }
  }
]
```


## Observations & Comments

 * __Targeted Redaction.__ For excluding the `customer_info` sub-document where its `category` field is marked as _sensitive_, a `$cond` operator is used to check the value of the `category` field, returning the `$$REMOVE` variable to indicate for the sub-document to be excluded. There is an alternative approach that can be used instead, using a `$redact` stage to achieve the same thing. However, a `$redact` stage typically requires more database processing effort by needing to check every field in the document. Therefore, when only one specific sub-document is to be optionally redacted out per record, it is generally optimal to adopt the approach shown in this example.
 
 * __Regular Expression.__ For masking the `card_name` field, a regular expression operator is used to extract the last word in the field's original value. The `$regexFind` returns metadata into the stage's outputted records, indicating if the match succeeded and what the matched value was. Therefore, an additional `$set` stage is required later in the pipeline to extract the actual matched word from this metadata and prefix it with some hardcoded text.
 
 * __Unset Alternative.__ If this example was being consistent with the other examples in this book, an additional `$unset` stage would have been included in the pipeline to mark the `_id` field for exclusion. However, in this case, chiefly just to show there is another way, the `_id` field is actually marked for exclusion in the `$set` stage, by being assigned the `$$REMOVE` variable.

 * __Meaningful Insight.__ Even though data is being irreversibly obfuscated it doesn't mean that the masked data results are not useful for performing analytics on, to gain insight. This applies to the results of masking operations that only fluctuate original values by a small random percentage (e.g. _card_expiry_, _transaction_amount_), rather than replacing them with unrelated random values (e.g. _card_sec_code_). In these cases, if there is a sufficient volume of data records, then minor variances will be roughly equalled out, allowing similar trends and patterns to still be determined from analysing the masked data-set versus the original data-set.
 
 * __Further Reading.__ This example is actually based on the output of two blog posts: 1) [MongoDB Irreversible Data Masking](https://pauldone.blogspot.com/2021/02/mongdb-data-masking.html), and 2) [MongoDB Reversible Data Masking](https://pauldone.blogspot.com/2021/02/mongdb-reversible-data-masking.html)
 
