import { html } from 'foldkit/html'

const { main, keyed } = html<Message>()

// Key by route tag so Snabbdom knows these are distinct trees
main([], [keyed('div')(model.route._tag, [], [routeContent])])
