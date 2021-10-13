# Advanced Use Of Expressions For Array Processing

One of the most compelling aspects of MongoDB is the ability to embed arrays within documents. Unlike relational databases, this characteristic typically allows each entity's entire data structure to exist in one place as a document. Documents better represent "real-world" objects and how developers think about such entities. When writing code to interact with the stored data, this intuitive data representation reduces the cognitive load on developers, enabling them to deliver new application capabilities quicker.

The Aggregation Framework provides a [rich set of aggregation operator expressions](https://docs.mongodb.com/manual/reference/operator/aggregation/#array-expression-operators) for analysing and manipulating arrays. When [optimising for performance](performance.md#2-avoid-unwinding--regrouping-documents-just-to-process-array-elements), these array expressions are critical to avoid unwinding and regrouping documents where you only need to process each document's array in isolation. For most situations when you need to manipulate an array, there is usually a single [array operator expression](https://docs.mongodb.com/manual/reference/operator/aggregation/#array-expression-operators) that you can turn to solve your requirement. 

Occasionally, you may still need to assemble a composite of multiple lower-level expressions to handle a challenging array manipulation task. These situations are the most difficult aspect for anyone using the Aggregation Framework. As a result, this chapter endeavours to bootstrap the knowledge you will require to fulfil such undertakings. Like aggregation pipelines in general, a large part of the challenge relates to adapting your mindset to a [Functional programming](https://en.wikipedia.org/wiki/Functional_programming) paradigm rather than a [Procedural](https://en.wikipedia.org/wiki/Procedural_programming) one. As this book discusses in its [introductory chapter](../intro/introducing-aggregations.md#what-is-mongodbs-aggregations-language), the functional aspect of aggregations is essential for the database's aggregation engine to process data at scale efficiently. 
 
Comparing with procedural approaches can help to bring clarity when describing array manipulation pipeline logic. Therefore, the first few explanations in this chapter include examples of equivalent JavaScript code snippets you would use to achieve comparable outcomes in regular client-side applications.

Lastly, if you haven't read this book's [Expressions Explained chapter](expressions.md) yet, you should do so before continuing with this chapter.


## "If-Else" Conditional Comparison

Even though performing conditional comparisons is more of a general principle than specific to array manipulation, it is first worth touching upon it to introduce the topic of advanced expressions. Consider the trivialised scenario of a retailer wanting to calculate the total cost of a customer’s shopping order. The customer might order multiple of the same product, and the vendor applies a discount if more than 5 of the product items are in the order.

In a procedural style of JavaScript, you might write the following code to calculate the total order cost:

```javascript
let order = {"product" : "WizzyWidget", "price": 25.99, "qty": 8};

// Procedural style JavaScript
if (order.qty > 5) {
  order.cost = order.price * order.qty * 0.9;
} else {
  order.cost = order.price * order.qty;
}
```

This code modifies the customer’s order to the following, to include the total cost:

```javascript
{product: 'WizzyWidget', qty: 8, price: 25.99, cost: 187.128}
```

To achieve a similar outcome in an aggregation pipeline, you might use the following:

```javascript
db.customer_orders.insertOne(order);

var pipeline = [
  {"$set": {
    "cost": {
      "$cond": { 
        "if":   {"$gte": ["$qty", 5 ]}, 
        "then": {"$multiply": ["$price", "$qty", 0.9]},
        "else": {"$multiply": ["$price", "$qty"]},
      }    
    },
  }},
];

db.customer_orders.aggregate(pipeline);
```

This pipeline produces the following output with the customer order document transformed to:

```javascript
{product: 'WizzyWidget', price: 25.99, qty: 8, cost: 187.128}
```

If you were going to use a functional programming approach in JavaScript, the code would be more like the following to achieve the same outcome:

```javascript
// Functional style JavaScript
order.cost = (
              (order.qty > 5) ?
              (order.price * order.qty * 0.9) :
              (order.price * order.qty)
             );
```

Here, you can see that the JavaScript code's construction in a functional style more closely resembles the aggregation pipeline's structure. This comparison highlights why some people may find composing aggregation expressions foreboding. The challenge is predominantly due to the less familiar paradigm of functional programming rather than the intricacies of MongoDB's aggregation language per se.

The other difference in this comparison and the rest of the comparisons in this chapter is the pipeline will work unchanged when run against a collection of many records, which could feasibly be many billions. The sample JavaScript code only works against one document at a time and would need to be modified to loop through a list of records. This JavaScript code would need to fetch each document from the database back to a client, apply the modifications and then write the result back to the database. Instead, the aggregation pipeline’s logic operates against each document in-situ within the database for far superior performance and efficiency.


## The "Power" Array Operators

When you want to transform or extract data from an array field, and a single high-level array operator (e.g. `$avg`, `$max`, `$filter`) does not give you what you need, the tools to turn to are the `$map` and `$reduce` array operators. These two "power" operators enable you to iterate through an array, perform whatever complexity of logic you need against each array element and collect together the result for inclusion in a stage's output. 

The `$map` and `$reduce` operators are the "swiss army knives" of the Aggregation Framework. Do not confuse these two array operators with MongoDB's old [Map-Reduce API](https://docs.mongodb.com/manual/core/map-reduce/), which was essentially made redundant and obsolete by the [emergence of the superior Aggregation Framework in MongoDB](../intro/history.html). In the old Map-Reduce API, you combine a `map()` function and a `reduce()` function to generate a result. In the Aggregation Framework, the `$map` and `$reduce` operators are independent of each other. Depending on your specific requirements, you would use one or the other to process an array's field, but not both together. Here's an explanation of these two "power" operators:

 * [`$map`](https://docs.mongodb.com/manual/reference/operator/aggregation/map/). Allows you to specify some logic to perform against each element in the array that the operator iterates, returning an array as the final result. Typically you use `$map` to mutate each array member and then return this transformed array. The `$map` operator exposes the current array element's content to your logic via a special variable, with the default name of `$$this`.
 * [`$reduce`](https://docs.mongodb.com/manual/reference/operator/aggregation/reduce/). Similarly, you can specify some logic to execute for each element in an array that the operator iterates but instead returning a single value (rather than an array) as the final result. You typically use `$reduce` to compute a summary having analysed each array element. For example, you might want to return a number by multiplying together a specific field value from each array's element. Like the `$map` operator, the `$reduce` operator provides your logic with access to the current array element via the variable `$$this`. The operator also provides a second variable, called `$$value`, for your logic to update when accumulating the single result (e.g. the multiplication result).

The rest of this chapter explores how these two "power" operators are used to manipulate arrays.


## "For-Each" Looping To Transform An Array

Imagine you wanted to process a list of the products ordered by a customer and convert the array of product names to upper case. In a procedural style of JavaScript, you might write the following code to loop through each product in the array and convert its name to upper case:

```javascript
let order = {
  "orderId": "AB12345",
  "products": ["Laptop", "Kettle", "Phone", "Microwave"]
};
 
// Procedural style JavaScript
for (let pos in order.products) {
  order.products[pos] = order.products[pos].toUpperCase();
}
```

This code modifies the order’s product names to the following, with the product names now in uppercase:

```javascript
{orderId: 'AB12345', products: ['LAPTOP', 'KETTLE', 'PHONE', 'MICROWAVE']}
```

To achieve a similar outcome in an aggregation pipeline, you might use the following:

```javascript
db.orders.insertOne(order);

var pipeline = [
  {"$set": {
    "products": {
      "$map": {
        "input": "$products",
        "as": "product",
        "in": {"$toUpper": "$$product"}
      }
    }
  }}
];

db.orders.aggregate(pipeline);
```

Here, a `$map` operator expression is applied to loop through each product name in the input products array and add the upper case version of the product name to the replacement output array.

This pipeline produces the following output with the order document transformed to:

```javascript
{orderId: 'AB12345', products: ['LAPTOP', 'KETTLE', 'PHONE', 'MICROWAVE']}
```

Using functional style in JavaScript, your looping code would more closely resemble the following to achieve the same outcome:

```javascript
// Functional style JavaScript
order.products = order.products.map(
  product => {
    return product.toUpperCase(); 
  }
);
```

Comparing an aggregation `$map` operator expression to a JavaScript `map()` array function is far more illuminating to help explain how the operator works.


## "For-Each" Looping To Compute A Summary Value From An Array

Suppose you wanted to process a list of the products ordered by a customer but produce a single summary string field from this array by concatenating all the product names from the array. In a procedural JavaScript style, you could code the following to produce the product names summary field:

```javascript
let order = {
  "orderId": "AB12345",
  "products": ["Laptop", "Kettle", "Phone", "Microwave"]
};
 
order.productList = "";

// Procedural style JavaScript
for (const pos in order.products) {
  order.productList += order.products[pos] + "; ";
}
```

This code yields the following output with a new `productList` string field produced, which contains the names of all the products in the order, delimited by semi-colons:

```javascript
{
  orderId: 'AB12345',
  products: [ 'Laptop', 'Kettle', 'Phone', 'Microwave' ],
  productList: 'Laptop; Kettle; Phone; Microwave; '
}
```

You can use the following pipeline to achieve a similar outcome:

```javascript
db.orders.insertOne(order);

var pipeline = [
  {"$set": {
    "productList": {
      "$reduce": {
        "input": "$products",
        "initialValue": "",
        "in": {
          "$concat": ["$$value", "$$this", "; "]
        }            
      }
    }
  }}
];

db.orders.aggregate(pipeline);
```

Here, a `$reduce` operator expression loops through each product in the input array and concatenates each product’s name into an accumulating string. You use the `$$this` expression to access the current array element's value during each iteration. For each iteration, you employ the `$$value` expression to reference the final output value, to which you append the current product string (+ delimiter).

This pipeline produces the following output where it transforms the order document to:

```javascript
{
  orderId: 'AB12345',
  products: [ 'Laptop', 'Kettle', 'Phone', 'Microwave' ],
  productList: 'Laptop; Kettle; Phone; Microwave; '
}
```

Using a functional approach in JavaScript, you could have used the following code to achieve the same result:

```javascript
// Functional style JavaScript
order.productList = order.products.reduce(
  (previousValue, currentValue) => {
    return previousValue + currentValue + "; ";
  },
  ""
);
```

Once more, by comparing the use of the aggregation operator expression (`$reduce`) to the equivalent JavaScript array function (`reduce()`), the similarity is more pronounced.


## "For-Each" Looping To Locate An Array Element

Imagine storing data about buildings on a campus where each building document contains an array of rooms with their sizes (width and length). A room reservation system may require finding the first room in the building with sufficient floor space for a particular number of meeting attendees. Below is an example of one building's data you might load into the database, with its array of rooms and their dimensions in metres:

```javascript
db.buildings.insertOne({
  "building": "WestAnnex-1",
  "room_sizes": [
    {"width": 9, "length": 5},
    {"width": 8, "length": 7},
    {"width": 7, "length": 9},
    {"width": 9, "length": 8},
  ]
});
```

You want to create a pipeline to locate an appropriate meeting room that produces an output similar to the following. The result should contain a newly added field, `firstLargeEnoughRoomArrayIndex`, to indicate the array position of the first room found to have enough capacity.

```javascript
{
  building: 'WestAnnex-1',
  room_sizes: [
    { width: 9, length: 5 },
    { width: 8, length: 7 },
    { width: 7, length: 9 },
    { width: 9, length: 8 }
  ],
  firstLargeEnoughRoomArrayIndex: 2
}
```

Below is a suitable pipeline that iterates through the room array elements capturing the position of the first one with a calculated area greater than 60m&sup2;:

```javascript
var pipeline = [
  {"$set": {
    "firstLargeEnoughRoomArrayIndex": {
      "$reduce": {
        "input": {"$range": [0, {"$size": "$room_sizes"}]},
        "initialValue": -1,
        "in": {
          "$cond": { 
            "if": {
              "$and": [
                // IF ALREADY FOUND DON'T CONSIDER SUBSEQUENT ELEMENTS
                {"$lt": ["$$value", 0]}, 
                // IF WIDTH x LENGTH > 60
                {"$gt": [
                  {"$multiply": [
                    {"$getField": {"input": {"$arrayElemAt": ["$room_sizes", "$$this"]}, "field": "width"}},
                    {"$getField": {"input": {"$arrayElemAt": ["$room_sizes", "$$this"]}, "field": "length"}},
                  ]},
                  60
                ]}
              ]
            }, 
            // IF ROOM SIZE IS BIG ENOUGH CAPTURE ITS ARRAY POSITION
            "then": "$$this",  
            // IF ROOM SIZE NOT BIG ENOUGH RETAIN EXISTING VALUE (-1)
            "else": "$$value"  
          }            
        }            
      }
    }
  }}
];

db.buildings.aggregate(pipeline);
```

Here the `$reduce` operator is again used to loop and eventually return a single value. However, the pipeline uses a generated sequence of incrementing numbers for its input rather than the existing array field in each source document. The `$range` operator is used to create this sequence which has the same size as the rooms array field of each document. The pipeline uses this approach to track the array position of the matching room using the `$$this` variable. For each iteration, the pipeline calculates the array room element's area. If the size is greater than 60, the pipeline assigns the current array position (represented by `$$this`) to the final result (represented by` $$value`).

The "iterator" array expressions have no concept of a _break_ command that procedural programming languages typically provide. Therefore, even though the executing logic may have already located a room of sufficient size, the looping process will continue through the remaining array elements. Consequently, the pipeline logic must include a check during each iteration to avoid overriding the final value (the `$$value` variable) if it already has a value. Naturally, for massive arrays containing a few hundred or more elements, an aggregation pipeline will incur a noticeable latency impact when iterating the remaining array members even though the logic has already identified the required element. 


## Reproducing _$map_ Behaviour Using _$reduce_

It is possible to implement the `$map` behaviour using `$reduce` to transform an array. This method is more complex, but you may need to use it in some rare circumstances. Before looking at an example of why let's first compare a more basic example of using `$map` and then `$reduce` to achieve the same thing. 

Suppose you have captured some sensor readings for a device:

```javascript
db.deviceReadings.insertOne({
  "device": "A1",
  "readings": [27, 282, 38, 22, 187]
});
```

Imagine you want to produce a transformed version of the `readings` array, with the device’s ID concatenated with each reading in the array. You want the pipeline to produce an output similar to the following, with the newly included array field:

```javascript
{
  device: 'A1',
  readings: [ 27, 282, 38, 22, 187 ],
  deviceReadings: [ 'A1:27', 'A1:282', 'A1:38', 'A1:22', 'A1:187' ]
}
```

You can achieve this using the `$map` operator expression in the following pipeline:

```javascript
var pipeline = [
  {"$set": {
    "deviceReadings": {
      "$map": {
        "input": "$readings",
        "as": "reading",
        "in": {
          "$concat": ["$device", ":", {"$toString": "$$reading"}]
        }
      }
    }
  }}
];

db.deviceReadings.aggregate(pipeline);
```

You can also accomplish the same with the `$reduce` operator expression in the following pipeline:

```javascript
var pipeline = [
  {"$set": {
    "deviceReadings": {
      "$reduce": {
        "input": "$readings",
        "initialValue": [],
        "in": {
          "$concatArrays": [
            "$$value",
            [{"$concat": ["$device", ":", {"$toString": "$$this"}]}]
          ]
        }
      }
    }
  }}
];

db.deviceReadings.aggregate(pipeline);
```

You will see the pipeline has to do more work here, holding the transformed element in a new array and then concatenating this with the "final value" array the logic is accumulating in the `$$value` variable. 

So why would you ever want to use `$reduce` for this requirement and take on this extra complexity? Well, suppose the aggregation output containing the transformed array needed to include the element's array position number in the concatenated string value to yield a result similar to the following:

```javascript
{
  device: 'A1',
  readings: [ 27, 282, 38, 22, 187 ],
  deviceReadings: [ 'A1-0:27', 'A1-1:282', 'A1-2:38', 'A1-3:22', 'A1-4:187' ]
}
```

You cannot achieve this using `$map` because the logic in each iteration does not know the current loop count or input array position. However, you can solve this by using `$reduce` if adopting the pattern where the input is a `$range` generated sequence of incrementing numbers (as covered earlier in this chapter). Consequently, the string concatenating code can include the array position in each transformed element's value (accessed via the `$$this` variable), as shown in the pipeline below:

```javascript
var pipeline = [
  {"$set": {
    "deviceReadings": {
      "$reduce": {
        "input": {"$range": [0, {"$size": "$readings"}]},
        "initialValue": [],
        "in": {
          "$concatArrays": [
            "$$value",
            [{"$concat": [
              "$device",
              "-",
              {"$toString": "$$this"},
              ":",
              {"$toString": {"$arrayElemAt": ["$readings", "$$this"]}},
            ]}]
          ]
        }
      }
    }
  }}
];

db.deviceReadings.aggregate(pipeline);
```


## Adding New Fields To Existing Objects In An Array

One of the primary uses of the `$map` operator expression is to add more data to each existing object in an array. Suppose you've persisted a set of retail orders, where each order document contains an array of order items. Each order item in the array captures the product’s name, unit price, and quantity purchased, as shown in the example below:

```javascript
db.orders.insertOne({
    "custid": "jdoe@acme.com",
    "items": [
      {
        "product" : "WizzyWidget", 
        "unitPrice": 25.99,
        "qty": 8,
      },
      {
        "product" : "HighEndGizmo", 
        "unitPrice": 33.24,
        "qty": 3,
      }
    ]
});
```

You now need to calculate the total cost for each product item (`quantity` x `unitPrice`) and add that cost to the corresponding order item in the array. You can use a pipeline similar to the following to achieve this:

```javascript
var pipeline = [
  {"$set": {
    "items": {
      "$map": {
        "input": "$items",
        "as": "item",
        "in": {
          "product": "$$item.product",
          "unitPrice": "$$item.unitPrice",
          "qty": "$$item.qty",
          "cost": {"$multiply": ["$$item.unitPrice", "$$item.qty"]}},
        }
      }
    }
  }
];

db.orders.aggregate(pipeline);
```

Here, for each element in the source array, the pipeline creates an element in the new array by explicitly pulling in the three fields from the old element (`product`, `unitPrice` and `quantity`) and adding one new computed field (`cost`). The pipeline produces the following output:

```javascript
{
  custid: 'jdoe@acme.com',
  items: [
    {
      product: 'WizzyWidget',
      unitPrice: 25.99,
      qty: 8,
      cost: 187.128
    },
    {
      product: 'HighEndGizmo',
      unitPrice: 33.24,
      qty: 3,
      cost: 99.72
    }
  ]
}
```

Similar to the disadvantages of using a `$project` stage in a pipeline, [outlined in an earlier chapter](project.md), the `$map` code is burdened by explicitly naming every field in the array element to retain. You will find this tiresome if each array element has lots of fields. In addition, if your data model evolves and new types of fields appear in the array's items over time, you will be forced to return to your pipeline and refactor it each time to include these newly introduced fields. 

Just like using `$set` instead of `$project` for a pipeline stage, there is a better solution to allow you to retain all existing array item fields and add new ones when you process arrays. A good solution is to employ the [`$mergeObjects`](https://docs.mongodb.com/manual/reference/operator/aggregation/merge/) operator expression to combine all existing fields plus the newly computed fields into each new array element. `$mergeObjects` takes an array of objects and combines the fields from all the array's objects into one single object. To use `$mergeObjects` in this situation, you provide the current array element as the first parameter to `$mergeObjects`. The second parameter you provide is a new object containing each computed field. In the example below, the code adds only one generated field, but if you require it, you can include multiple generated fields in this new object:

```javascript
var pipeline = [
  {"$set": {
    "items": {
      "$map": {
        "input": "$items",
        "as": "item",
        "in": {
          "$mergeObjects": [
            "$$item",            
            {"cost": {"$multiply": ["$$item.unitPrice", "$$item.qty"]}},
          ]
        }
      }
    }
  }}
];

db.orders.aggregate(pipeline);
```

This pipeline produces the same output as the previous "hardcoded field names" pipeline, but with the advantage being sympathetic to new types of fields appearing in the source array in the future. 

Instead of using `$mergeObjects`, there is an alternative and slightly more verbose combination of three different array operator expressions that you can similarly employ to retain all existing array item fields and add new ones. These three operators are:

 * [`$objectToArray`](https://docs.mongodb.com/manual/reference/operator/aggregation/objectToArray/). This converts an object containing different field key/value pairs into an array of objects where each object has two fields: `k`, holding the field's name, and `v`, holding the field's value. For example: `{height: 170, weight: 60}` becomes `[{k: 'height', v: 170}, {k: 'weight', v: 60}]`
 * [`$concatArrays`](https://docs.mongodb.com/manual/reference/operator/aggregation/concatArrays/). This combines the contents of multiple arrays into one single array result.
 * [`$arrayToObject`](https://docs.mongodb.com/manual/reference/operator/aggregation/arrayToObject/). This converts an array into an object by performing the reverse of the `$objectToArray` operator. For example: `{k: 'height', v: 170}, {k: 'weight', v: 60}, {k: 'shoeSize', v: 10}]` becomes `{height: 170, weight: 60, shoeSize: 10}`

The pipeline below shows the combination in action for the same retail orders data set as before, adding the newly computed total cost for each product:

```javascript
var pipeline = [
  {"$set": {
    "items": {
      "$map": {
        "input": "$items",
        "as": "item",
        "in": {
          "$arrayToObject": {
            "$concatArrays": [
              {"$objectToArray": "$$item"},            
              [{
                "k": "cost",
                "v": {"$multiply": ["$$item.unitPrice", "$$item.qty"]},
              }]              
            ]
          }
        }
      }
    }}
  }
];

db.orders.aggregate(pipeline);
```

If this achieves the same as using `$mergeObjects` but is more verbose, why bother using this pattern? Well, in most cases, you wouldn't. One situation where you would use the more verbose combination is if you need to dynamically set the name of an array item's field, in addition to its value. Rather than naming the computed total field as `cost`, suppose you want the field's name also to reflect the product's name (e.g. `costForWizzyWidget`, `costForHighEndGizmo`). You can achieve this by using the `$arrayToObject`/`$concatArrays`/`$objectToArray` approach rather than the `$mergeObjects` method, as follows:

```javascript
var pipeline = [
  {"$set": {
    "items": {
      "$map": {
        "input": "$items",
        "as": "item",
        "in": {
          "$arrayToObject": {
            "$concatArrays": [
              {"$objectToArray": "$$item"},            
              [{
                "k": {"$concat": ["costFor", "$$item.product"]},
                "v": {"$multiply": ["$$item.unitPrice", "$$item.qty"]},
              }]              
            ]
          }
        }
      }
    }}
  }
];

db.orders.aggregate(pipeline);
```

Below you can see the new pipeline's output. The pipeline has retained all existing array item's fields and added a new field to each item with a dynamically generated name.

```javascript
{
  custid: 'jdoe@acme.com',
  items: [
    {
      product: 'WizzyWidget',
      unitPrice: 25.99,
      qty: 8,
      costForWizzyWidget: 207.92
    },
    {
      product: 'HighEndGizmo',
      unitPrice: 33.24,
      qty: 3,
      costForHighEndGizmo: 99.72
    }
  ]
}
```

When retaining existing items from an array, plus adding new fields, you can use either approach to override an existing item's field with a new value. For example, you may want to modify the current `unitPrice` field to incorporate a discount. For both `$mergeObjects` and `$arrayToObject` expressions, to achieve this, you provide a re-definition of the field as a subsequent parameter after first providing the reference to the source array item. This tactic works because the last definition wins if the same field is defined more than once with different values.


## Rudimentary Schema Reflection Using Arrays

As a final "fun" example, let's see how to employ an `$objectToArray` operator expression to use [reflection](https://en.wikipedia.org/wiki/Reflective_programming) to analyse the shape of a collection of documents as part of a custom schema analysis tool. Such reflection capabilities are vital in databases that provide a flexible data model, such as MongoDB, where the included fields may vary from document to document. 

Imagine you have a collection of customer documents, similar to the following:

```javascript
db.customers.insertMany([
  {
    "_id": ObjectId('6064381b7aa89666258201fd'),
    "email": 'elsie_smith@myemail.com',
    "dateOfBirth": ISODate('1991-05-30T08:35:52.000Z'),
    "accNnumber": 123456,
    "balance": NumberDecimal("9.99"),
    "address": {
      "firstLine": "1 High Street",
      "city": "Newtown",
      "postcode": "NW1 1AB",
    },
    "telNums": ["07664883721", "01027483028"],
    "optedOutOfMarketing": true,
  },
  {
    "_id": ObjectId('734947394bb73732923293ed'),
    "email": 'jon.jones@coolemail.com',
    "dateOfBirth": ISODate('1993-07-11T22:01:47.000Z'),
    "accNnumber": 567890,
    "balance": NumberDecimal("299.22"),
    "telNums": "07836226281",
    "contactPrefernece": "email",
  },
]);
```

In your schema analysis pipeline, you use `$objectToArray` to capture the name and type of each top-level field in the document as follows:

```javascript
var pipeline = [
  {"$project": {
    "_id": 0,
    "schema": {
      "$map": {
        "input": {"$objectToArray": "$$ROOT"},
        "as": "field",
        "in": {
          "fieldname": "$$field.k",
          "type": {"$type": "$$field.v"},          
        }
      }
    }
  }}
];

db.customers.aggregate(pipeline);
```

For the two example documents in the collection, the pipeline outputs the following:

```javascript
{
  schema: [
    {fieldname: '_id', type: 'objectId'},
    {fieldname: 'email', type: 'string'},
    {fieldname: 'dateOfBirth', type: 'date'},
    {fieldname: 'accNnumber', type: 'int'},
    {fieldname: 'balance', type: 'decimal'},
    {fieldname: 'address', type: 'object'},
    {fieldname: 'telNums', type: 'array'},
    {fieldname: 'optedOutOfMarketing', type: 'bool'}
  ]
},
{
  schema: [
    {fieldname: '_id', type: 'objectId'},
    {fieldname: 'email', type: 'string'},
    {fieldname: 'dateOfBirth', type: 'date'},
    {fieldname: 'accNnumber', type: 'int'},
    {fieldname: 'balance', type: 'decimal'},
    {fieldname: 'telNums', type: 'string'},
    {fieldname: 'contactPrefernece', type: 'string'}
}
```

The difficulty with this basic pipeline approach is once there are many documents in the collection, the output will be too lengthy and complex for you to detect common schema patterns. Instead, you will want to add an `$unwind` and `$group` stage combination to accumulate recurring fields that match. The generated result should also highlight if the same field name appears in multiple documents but with different data types. Here is the improved pipeline:

```javascript
var pipeline = [
  {"$project": {
    "_id": 0,
    "schema": {
      "$map": {
        "input": {"$objectToArray": "$$ROOT"},
        "as": "field",
        "in": {
          "fieldname": "$$field.k",
          "type": {"$type": "$$field.v"},          
        }
      }
    }
  }},
  
  {"$unwind": "$schema"},

  {"$group": {
    "_id": "$schema.fieldname",
    "types": {"$addToSet": "$schema.type"},
  }},
  
  {"$set": {
    "fieldname": "$_id",
    "_id": "$$REMOVE",
  }},
];

db.customers.aggregate(pipeline);
```

This pipeline’s output now provides a far more comprehensible summary, as shown below:

```javascript
{fieldname: '_id', types: ['objectId']},
{fieldname: 'address', types: ['object']},
{fieldname: 'email', types: ['string']},
{fieldname: 'telNums', types: ['string', 'array']},
{fieldname: 'contactPrefernece', types: ['string']},
{fieldname: 'accNnumber', types: ['int']},
{fieldname: 'balance', types: ['decimal']},
{fieldname: 'dateOfBirth', types: ['date']},
{fieldname: 'optedOutOfMarketing', types: ['bool']}
```

This result highlights that the `telNums` field can have one of two different data types within documents.

The main drawback of this rudimentary schema analysis pipeline is its inability to descend through layers of arrays and sub-documents hanging off each top-level document. This challenge is indeed solvable using a pure aggregation pipeline, but the code involved is far more complex and beyond the scope of this chapter. If you are interested in exploring this further, you can customise the ["graphDescend" GitHub example project](https://github.com/pkdone/mongo-agg-graph-descend). That project shows you how to traverse through hierarchically structured documents using a single aggregation pipeline.


## Further Array Manipulation Examples

This book's [Array Manipulation Examples](../examples/array-manipulations/array-manipulations.md) section contains more examples of using expressions to process arrays.

