import { Cart, Item } from './domain'
import { Home, Products } from './page'

// Access page modules
Home.Model
Home.view(model.home, message => HomeMessage({ message }))

// Access domain modules
Cart.addItem(item)(cart)
Cart.totalItems(cart)
