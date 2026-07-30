import { Array, Effect, Fiber, Option, Ref, pipe } from 'effect'
import { TestClock } from 'effect/testing'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import {
  AppliedPromo,
  Cart,
  ClickedBack,
  ClickedCancel,
  ClickedContinue,
  ClickedPlaceOrder,
  ClickedStartOver,
  PlaceOrder,
  RejectedPromo,
  SelectedEdition,
  SubmittedPromoCode,
  SucceededPlaceOrder,
  TRANSITION_LOG_LIMIT,
  ToggledPaymentMethod,
  ToggledTermsAccepted,
  UpdatedPromoCode,
  initialModel,
  update,
} from './main'
import type { Model } from './main'

const maybeLatestTransitionSummary = (model: Model): Option.Option<string> =>
  pipe(
    Array.head(model.transitionLog),
    Option.map(entry => entry.summary),
  )

describe('update', () => {
  test('PlaceOrder waits before succeeding', () =>
    Effect.runPromise(
      Effect.gen(function* () {
        const didComplete = yield* Ref.make(false)
        const fiber = yield* Effect.forkChild(
          PlaceOrder({ isShippingRequired: false }).effect.pipe(
            Effect.tap(() => Ref.set(didComplete, true)),
          ),
          { startImmediately: true },
        )

        yield* TestClock.adjust('999 millis')
        expect(yield* Ref.get(didComplete)).toBe(false)

        yield* TestClock.adjust('1 millis')
        expect(yield* Fiber.join(fiber)).toStrictEqual(
          SucceededPlaceOrder({ orderId: 'DIGI-1001' }),
        )
      }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
    ))

  test('physical carts visit Shipping before Payment', () => {
    story(
      update,
      given(initialModel),
      message(ClickedContinue()),
      Command.expectNone(),
      model(model => {
        expect(model.checkout._tag).toBe('Shipping')
        expect(maybeLatestTransitionSummary(model)).toEqual(
          Option.some('Cart -> Shipping on ClickedContinue'),
        )
      }),
      message(ClickedContinue()),
      model(model => {
        expect(model.checkout._tag).toBe('Payment')
        expect(Array.map(model.transitionLog, entry => entry.summary)).toEqual([
          'Shipping -> Payment on ClickedContinue',
          'Cart -> Shipping on ClickedContinue',
        ])
      }),
    )
  })

  test('digital carts skip Shipping through the otherwise branch', () => {
    story(
      update,
      given(initialModel),
      message(SelectedEdition({ isShippingRequired: false })),
      message(ClickedContinue()),
      model(model => {
        expect(model.checkout._tag).toBe('Payment')
      }),
      message(ClickedBack()),
      model(model => {
        expect(model.checkout._tag).toBe('Cart')
      }),
    )
  })

  test('starting over after cancelling keeps the selected edition', () => {
    story(
      update,
      given(initialModel),
      message(SelectedEdition({ isShippingRequired: false })),
      message(ClickedCancel()),
      model(model => {
        expect(model.checkout._tag).toBe('Cancelled')
      }),
      message(ClickedStartOver()),
      model(model => {
        expect(model.checkout).toStrictEqual(
          Cart({ isShippingRequired: false }),
        )
      }),
    )
  })

  test('a known promo code resolves to a discount and an unknown one clears it', () => {
    story(
      update,
      given(initialModel),
      message(SelectedEdition({ isShippingRequired: false })),
      message(ClickedContinue()),
      message(ToggledPaymentMethod({ isSelected: true })),
      message(ClickedContinue()),
      message(UpdatedPromoCode({ value: ' reader10 ' })),
      message(SubmittedPromoCode()),
      model(model => {
        expect(model.checkout._tag).toBe('Review')
        if (model.checkout._tag === 'Review') {
          expect(model.checkout.promo).toEqual(
            AppliedPromo({ discount: { code: 'READER10', percentOff: 10 } }),
          )
        }
      }),
      message(UpdatedPromoCode({ value: 'BOGUS' })),
      message(SubmittedPromoCode()),
      model(model => {
        expect(model.checkout._tag).toBe('Review')
        if (model.checkout._tag === 'Review') {
          expect(model.checkout.promo).toEqual(RejectedPromo())
        }
        expect(maybeLatestTransitionSummary(model)).toEqual(
          Option.some('Review -> Review on SubmittedPromoCode'),
        )
      }),
    )
  })

  test('unaccepted review ignores place order without a Command', () => {
    story(
      update,
      given(initialModel),
      message(SelectedEdition({ isShippingRequired: false })),
      message(ClickedContinue()),
      message(ToggledPaymentMethod({ isSelected: true })),
      message(ClickedContinue()),
      message(ClickedPlaceOrder()),
      Command.expectNone(),
      model(model => {
        expect(model.checkout._tag).toBe('Review')
        expect(maybeLatestTransitionSummary(model)).toEqual(
          Option.some('ClickedPlaceOrder ignored in Review'),
        )
      }),
    )
  })

  test('ready review emits PlaceOrder after its guard passes', () => {
    story(
      update,
      given(initialModel),
      message(SelectedEdition({ isShippingRequired: false })),
      message(ClickedContinue()),
      message(ToggledPaymentMethod({ isSelected: true })),
      message(ClickedContinue()),
      message(ToggledTermsAccepted({ isAccepted: true })),
      message(ClickedPlaceOrder()),
      Command.expectExact(PlaceOrder({ isShippingRequired: false })),
      Command.resolve(
        PlaceOrder,
        SucceededPlaceOrder({ orderId: 'DIGI-1001' }),
      ),
      model(model => {
        expect(model.checkout._tag).toBe('Confirmed')
        if (model.checkout._tag === 'Confirmed') {
          expect(model.checkout.orderId).toBe('DIGI-1001')
        }
      }),
    )
  })

  test('the transition log truncates to the newest twenty entries', () => {
    const messageCount = TRANSITION_LOG_LIMIT + 5

    const finalModel = pipe(
      Array.makeBy(messageCount, index =>
        SelectedEdition({ isShippingRequired: index % 2 === 0 }),
      ),
      Array.reduce(initialModel, (model, message) => {
        const [nextModel] = update(model, message)
        return nextModel
      }),
    )

    expect(finalModel.transitionLog).toHaveLength(TRANSITION_LOG_LIMIT)
    expect(
      Option.map(Array.head(finalModel.transitionLog), entry => entry.id),
    ).toEqual(Option.some(messageCount - 1))
    expect(
      Option.map(Array.last(finalModel.transitionLog), entry => entry.id),
    ).toEqual(Option.some(messageCount - TRANSITION_LOG_LIMIT))
  })
})
