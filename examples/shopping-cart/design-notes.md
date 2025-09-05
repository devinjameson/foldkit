# Shopping Cart Design Notes

## Features to Add Before Submodel Extraction

To make submodel extraction more meaningful, we should add the following features:

### Products Page

- **Search functionality**: Add a search input to filter products by name
- **Filter products**: Maybe by price range or category
- Messages: `SearchProducts`, `FilterProducts`

### Cart Page

- **Clear cart**: Add a "Clear Cart" button to empty the entire cart
- Message: `ClearCart`

### Checkout Page

- **Order placement**: Make the "Place Order" button actually do something (show success state, clear cart)
- **Billing address form**: Add form fields for shipping/billing address
- **Payment method**: Add payment method selection (credit card, PayPal, etc.)
- Messages: `PlaceOrder`, `UpdateBillingAddress`, `UpdatePaymentMethod`

## Submodel Breakdown

Once we have these features, the submodels will have focused responsibilities:

### ProductCatalog Submodel

- Manages product display, search, and filtering
- Handles adding items to cart from the product view
- Messages: `AddToCart`, `ChangeQuantity`, `SearchProducts`, `FilterProducts`

### Cart Submodel

- Manages cart contents and operations
- Handles quantity changes and item removal
- Messages: `RemoveFromCart`, `ChangeQuantity`, `ClearCart`

### Checkout Submodel

- Manages order placement and form data
- Handles billing/payment information
- Messages: `PlaceOrder`, `UpdateBillingAddress`, `UpdatePaymentMethod`

This separation will make each submodel have a clear, focused purpose with its own set of messages.
