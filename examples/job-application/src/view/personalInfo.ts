import { Equal, Option } from 'effect'
import { Submodel } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { Valid } from 'foldkit/fieldValidation'
import { type Html, type HtmlBuilder, childAttributes } from 'foldkit/html'

import { DatePicker, Listbox } from '@foldkit/ui'

import { PronounOption } from '../domain'
import { PersonalInfo } from '../step'
import {
  backdropClassName,
  calendarView,
  panelClassName,
  triggerClassName,
  triggerContent,
} from './datePicker'
import { inputField } from './field'
import { chevronDown } from './icon'

const PronounsListbox = Listbox.create<string>()

export const personalInfoView = Submodel.defineView<
  PersonalInfo.Model,
  PersonalInfo.Message
>((model, h): Html => {
  const {
    firstName,
    lastName,
    email,
    phone,
    pronouns,
    maybeSelectedPronoun,
    customPronouns,
    portfolioUrl,
    availableDate,
  } = model

  const isOtherSelected = Option.exists(
    maybeSelectedPronoun,
    Equal.equals('Other'),
  )

  const selectedPronounLabel = Option.getOrElse(
    maybeSelectedPronoun,
    () => 'Select pronouns',
  )

  return h.div(
    [h.Class('space-y-4')],
    [
      h.div(
        [h.Class('grid grid-cols-2 gap-4')],
        [
          inputField(
            {
              id: 'first-name',
              label: 'First Name',
              field: firstName,
              onInput: value => PersonalInfo.UpdatedFirstName({ value }),
              placeholder: 'Jane',
            },
            h,
          ),
          inputField(
            {
              id: 'last-name',
              label: 'Last Name',
              field: lastName,
              onInput: value => PersonalInfo.UpdatedLastName({ value }),
              placeholder: 'Doe',
            },
            h,
          ),
        ],
      ),
      inputField(
        {
          id: 'email',
          label: 'Email',
          field: email,
          onInput: value => PersonalInfo.UpdatedEmail({ value }),
          type: 'email',
          placeholder: 'jane@example.com',
        },
        h,
      ),
      inputField(
        {
          id: 'phone',
          label: 'Phone (optional)',
          field: phone,
          onInput: value => PersonalInfo.UpdatedPhone({ value }),
          type: 'tel',
          placeholder: '+1 (555) 123-4567',
        },
        h,
      ),
      h.div(
        [h.Class('space-y-1')],
        [
          h.label(
            [h.Class('block text-sm font-medium text-gray-700')],
            ['Pronouns (optional)'],
          ),
          h.submodel({
            slotId: pronouns.id,
            model: pronouns,
            view: PronounsListbox.view,
            viewInputs: {
              anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
              items: PronounOption.all,
              maybeSelectedValue: maybeSelectedPronoun,
              itemToConfig: (pronoun, { isSelected }) => ({
                className:
                  'px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 data-[active]:bg-indigo-50',
                content: h.div(
                  [h.Class('flex items-center gap-2')],
                  [
                    h.span(
                      [
                        h.Class(
                          `w-4 text-indigo-600 ${isSelected ? 'visible' : 'invisible'}`,
                        ),
                      ],
                      ['✓'],
                    ),
                    h.span([], [pronoun]),
                  ],
                ),
              }),
              buttonContent: h.div(
                [h.Class('flex w-full items-center justify-between gap-2')],
                [
                  h.span(
                    [
                      h.Class(
                        Option.match(maybeSelectedPronoun, {
                          onNone: () => 'text-gray-400',
                          onSome: () => 'text-gray-900',
                        }),
                      ),
                    ],
                    [selectedPronounLabel],
                  ),
                  h.span([h.Class('text-gray-400')], [chevronDown('w-4 h-4')]),
                ],
              ),
              buttonAttributes: childAttributes([
                h.Class(
                  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500',
                ),
              ]),
              itemsAttributes: childAttributes([
                h.Class(
                  'w-(--button-width) rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden',
                ),
              ]),
              backdropAttributes: childAttributes([h.Class('fixed inset-0')]),
            },
            toParentMessage: message =>
              PersonalInfo.GotPronounsMessage({ message }),
          }),
        ],
      ),
      ...(isOtherSelected
        ? [
            inputField(
              {
                id: 'custom-pronouns',
                label: 'Custom Pronouns',
                field: Valid({ value: customPronouns }),
                onInput: value => PersonalInfo.UpdatedCustomPronouns({ value }),
                placeholder: 'Enter your pronouns',
              },
              h,
            ),
          ]
        : []),
      inputField(
        {
          id: 'portfolio-url',
          label: 'Portfolio URL (optional)',
          field: portfolioUrl,
          onInput: value => PersonalInfo.UpdatedPortfolioUrl({ value }),
          type: 'url',
        },
        h,
      ),
      availableDatePickerView(availableDate, model.maybeAvailableDate, h),
    ],
  )
})

const availableDatePickerView = (
  model: DatePicker.Model,
  maybeSelectedDate: Option.Option<CalendarDate>,
  h: HtmlBuilder<PersonalInfo.Message>,
): Html =>
  h.div(
    [h.Class('space-y-1')],
    [
      h.label(
        [h.Class('block text-sm font-medium text-gray-700')],
        ['Available Start Date (optional)'],
      ),
      h.submodel({
        slotId: model.id,
        model,
        view: DatePicker.view,
        viewInputs: {
          anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
          maybeSelectedDate,
          triggerContent: maybeDate => triggerContent(maybeDate, 'Pick a date'),
          triggerClassName,
          panelClassName,
          backdropClassName,
          toCalendarView: calendarView,
        },
        toParentMessage: message =>
          PersonalInfo.GotAvailableDateMessage({ message }),
      }),
    ],
  )
