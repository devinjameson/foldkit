// Building URLs from route data - same router, opposite direction!

const homeUrl = homeRouter.build({})
console.log(homeUrl)
// '/'

const peopleUrl = peopleRouter.build({ searchText: Option.none() })
console.log(peopleUrl)
// '/people'

const searchUrl = peopleRouter.build({
  searchText: Option.some('alice'),
})
console.log(searchUrl)
// '/people?searchText=alice'

const personUrl = personRouter.build({ personId: 42 })
console.log(personUrl)
// '/people/42'

// Use in your view to create type-safe links:
a([Href(personRouter.build({ personId: person.id }))], [person.name])
