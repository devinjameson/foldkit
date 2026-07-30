import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import {
  ClickedFindMe,
  ClickedLocation,
  ClickedMarker,
  CompletedLockBodyScroll,
  CompletedUnlockBodyScroll,
  DismissedGeolocate,
  FailedGeolocate,
  FailedMountMap,
  FlyTo,
  Geolocate,
  GeolocateFailed,
  GeolocateLocating,
  LockBodyScroll,
  MovedMap,
  SucceededFlyTo,
  SucceededGeolocate,
  SucceededMountMap,
  UnlockBodyScroll,
  UpdatedSearchQuery,
  update,
} from './main'
import { eiffelTower, initialModel, mountedModel } from './main.fixtures'

test('mounting the map records the host id in the Model', () => {
  story(
    update,
    given(initialModel),
    message(SucceededMountMap({ hostId: 'map-host-1' })),
    model(model => {
      expect(model.maybeMapHostId).toStrictEqual(Option.some('map-host-1'))
    }),
  )
})

test('movement events update the Model bounds', () => {
  story(
    update,
    given(mountedModel),
    message(
      MovedMap({
        bounds: { west: -180, south: -85, east: 180, north: 85 },
      }),
    ),
    model(model => {
      expect(model.maybeBounds).toStrictEqual(
        Option.some({ west: -180, south: -85, east: 180, north: 85 }),
      )
    }),
  )
})

test('clicking a marker selects the corresponding location', () => {
  story(
    update,
    given(mountedModel),
    message(ClickedMarker({ locationId: eiffelTower.id })),
    model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(
        Option.some(eiffelTower.id),
      )
    }),
  )
})

test('clicking a sidebar location selects it and emits a fly Command', () => {
  story(
    update,
    given(mountedModel),
    message(ClickedLocation({ locationId: eiffelTower.id })),
    model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(
        Option.some(eiffelTower.id),
      )
    }),
    Command.expectHas(FlyTo),
    Command.resolve(FlyTo, SucceededFlyTo()),
  )
})

test('clicking a sidebar location before the map mounts still emits FlyTo', () => {
  story(
    update,
    given(initialModel),
    message(ClickedLocation({ locationId: eiffelTower.id })),
    model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(
        Option.some(eiffelTower.id),
      )
      expect(model.maybeMapHostId).toStrictEqual(Option.none())
    }),
    Command.expectHas(FlyTo),
    Command.resolve(FlyTo, SucceededFlyTo()),
  )
})

test('a failed map mount surfaces the reason in the Model', () => {
  story(
    update,
    given(initialModel),
    message(FailedMountMap({ reason: 'Network timeout' })),
    model(model => {
      expect(model.maybeMapError).toStrictEqual(Option.some('Network timeout'))
    }),
  )
})

test('clicking a sidebar location with an unknown id is a no-op', () => {
  story(
    update,
    given(mountedModel),
    message(ClickedLocation({ locationId: 'does-not-exist' })),
    model(model => {
      expect(model.maybeSelectedLocationId).toStrictEqual(Option.none())
    }),
    Command.expectNone(),
  )
})

test('typing in the filter input updates the query', () => {
  story(
    update,
    given(initialModel),
    message(UpdatedSearchQuery({ value: 'Paris' })),
    model(model => {
      expect(model.searchQuery).toBe('Paris')
    }),
  )
})

test('clicking find-me transitions to the locating state and emits Geolocate', () => {
  story(
    update,
    given(initialModel),
    message(ClickedFindMe()),
    model(model => {
      expect(model.geolocateState._tag).toBe('GeolocateLocating')
    }),
    Command.expectHas(LockBodyScroll, Geolocate),
    Command.resolve(LockBodyScroll, CompletedLockBodyScroll()),
    Command.resolve(Geolocate, FailedGeolocate({ reason: 'Test cleanup' })),
  )
})

test('a successful geolocation result clears the locating state and flies the map', () => {
  story(
    update,
    given({
      ...mountedModel,
      geolocateState: GeolocateLocating(),
    }),
    message(SucceededGeolocate({ lng: 2.35, lat: 48.85 })),
    model(model => {
      expect(model.geolocateState._tag).toBe('GeolocateIdle')
      expect(model.maybeUserLocation).toStrictEqual(
        Option.some({ lng: 2.35, lat: 48.85 }),
      )
    }),
    Command.expectHas(UnlockBodyScroll, FlyTo),
    Command.resolve(UnlockBodyScroll, CompletedUnlockBodyScroll()),
    Command.resolve(FlyTo, SucceededFlyTo()),
  )
})

test('a failed geolocation result surfaces the reason in the geolocate state', () => {
  story(
    update,
    given({
      ...initialModel,
      geolocateState: GeolocateLocating(),
    }),
    message(FailedGeolocate({ reason: 'Permission denied' })),
    model(model => {
      expect(model.geolocateState._tag).toBe('GeolocateFailed')
      if (model.geolocateState._tag === 'GeolocateFailed') {
        expect(model.geolocateState.reason).toBe('Permission denied')
      }
    }),
  )
})

test('dismissing the geolocate overlay returns to idle', () => {
  story(
    update,
    given({
      ...initialModel,
      geolocateState: GeolocateFailed({ reason: 'Timed out' }),
    }),
    message(DismissedGeolocate()),
    model(model => {
      expect(model.geolocateState._tag).toBe('GeolocateIdle')
    }),
    Command.resolve(UnlockBodyScroll, CompletedUnlockBodyScroll()),
  )
})
