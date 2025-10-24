import {
  Array,
  Effect,
  Function,
  HashSet,
  Match as M,
  MutableRef,
  Option,
  Runtime,
  Stream,
} from 'effect'

import { ActiveSectionChanged, Model } from '../main'
import * as Page from '../page'

// CLAUDE: We need to be able to type these?
export const activeSectionCommandStream = {
  modelToDeps: (model: Model) => {
    const currentPageTableOfContents = M.value(model.route).pipe(
      M.tag(
        'GettingStarted',
        () => Page.GettingStarted.tableOfContents,
      ),
      M.tag('Architecture', () => Page.Architecture.tableOfContents),
      M.option,
    )

    return {
      pageId: model.route._tag,
      sections: Option.match(currentPageTableOfContents, {
        onNone: () => [],
        onSome: Array.map(({ id }) => id),
      }),
    }
  },
  depsToStream: ({ sections }) =>
    Stream.async<Runtime.Command<ActiveSectionChanged>>((emit) => {
      if (!Array.isNonEmptyReadonlyArray(sections)) {
        return Effect.void
      }

      const visibleSections = MutableRef.make(HashSet.empty<string>())

      const observer = new IntersectionObserver(
        (entries) => {
          Array.forEach(
            entries,
            ({ isIntersecting, target: { id } }) => {
              if (isIntersecting) {
                MutableRef.update(visibleSections, HashSet.add(id))
              } else {
                MutableRef.update(visibleSections, HashSet.remove(id))
              }
            },
          )

          const activeSectionId = Array.findFirst(
            sections,
            (sectionId) =>
              HashSet.has(MutableRef.get(visibleSections), sectionId),
          )

          Option.match(activeSectionId, {
            onNone: Function.constVoid,
            onSome: (sectionId) => {
              emit.single(
                Effect.succeed(
                  ActiveSectionChanged.make({ sectionId }),
                ),
              )
            },
          })
        },
        {
          rootMargin: '-100px 0px -80% 0px',
        },
      )

      Array.forEach(sections, (sectionId) => {
        const element = document.getElementById(sectionId)

        if (element) {
          observer.observe(element)
        }
      })

      return Effect.sync(() => observer.disconnect())
    }),
}
