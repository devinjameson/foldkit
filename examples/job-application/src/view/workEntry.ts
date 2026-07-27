import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Button, DatePicker } from '@foldkit/ui'

import { WorkHistory } from '../step'
import {
  backdropClassName,
  calendarView,
  panelClassName,
  triggerClassName,
  triggerContent,
} from './datePicker'
import { checkboxField, inputField, textareaField } from './field'

const ANCHOR = { placement: 'bottom-start' as const, gap: 4, padding: 8 }

export const workEntryView = Submodel.defineView<
  WorkHistory.Entry.Model,
  WorkHistory.Entry.Message
>((model, h): Html => {
  const showEndDate = !model.isCurrentlyEmployed

  const startDatePicker = h.div(
    [h.Class('space-y-1')],
    [
      h.label(
        [h.Class('block text-sm font-medium text-gray-700')],
        ['Start Date'],
      ),
      h.submodel({
        slotId: model.startDate.id,
        model: model.startDate,
        view: DatePicker.view,
        viewInputs: {
          anchor: ANCHOR,
          maybeSelectedDate: model.maybeStartDate,
          triggerContent: maybeDate =>
            triggerContent(maybeDate, 'Select start date'),
          toCalendarView: calendarView,
          triggerClassName,
          panelClassName,
          backdropClassName,
        },
        toParentMessage: message =>
          WorkHistory.Entry.GotStartDateMessage({ message }),
      }),
    ],
  )

  const endDatePicker = h.keyed('div')(
    `${model.id}-end-date`,
    [h.Class('space-y-1')],
    [
      h.label(
        [h.Class('block text-sm font-medium text-gray-700')],
        ['End Date'],
      ),
      h.submodel({
        slotId: model.endDate.id,
        model: model.endDate,
        view: DatePicker.view,
        viewInputs: {
          anchor: ANCHOR,
          maybeSelectedDate: model.maybeEndDate,
          triggerContent: maybeDate =>
            triggerContent(maybeDate, 'Select end date'),
          toCalendarView: calendarView,
          triggerClassName,
          panelClassName,
          backdropClassName,
        },
        toParentMessage: message =>
          WorkHistory.Entry.GotEndDateMessage({ message }),
      }),
    ],
  )

  return h.keyed('div')(
    model.id,
    [h.Class('py-6 space-y-4 first:pt-0')],
    [
      h.div(
        [h.Class('grid grid-cols-2 gap-3')],
        [
          inputField(
            {
              id: `${model.id}-company`,
              label: 'Company',
              field: model.company,
              onInput: value => WorkHistory.Entry.UpdatedCompany({ value }),
              placeholder: 'e.g. Acme Corp',
            },
            h,
          ),
          inputField(
            {
              id: `${model.id}-title`,
              label: 'Job Title',
              field: model.title,
              onInput: value => WorkHistory.Entry.UpdatedTitle({ value }),
              placeholder: 'e.g. Senior Engineer',
            },
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('grid grid-cols-2 gap-3')],
        [startDatePicker, ...(showEndDate ? [endDatePicker] : [])],
      ),
      checkboxField(
        {
          id: `${model.id}-current`,
          label: 'I currently work here',
          isChecked: model.isCurrentlyEmployed,
          onToggle: isChecked =>
            WorkHistory.Entry.ToggledCurrentlyEmployed({ isChecked }),
        },
        h,
      ),
      textareaField(
        {
          id: `${model.id}-description`,
          label: 'Description',
          value: model.description,
          onInput: value => WorkHistory.Entry.UpdatedDescription({ value }),
          rows: 3,
          placeholder: 'Describe your role and key accomplishments...',
        },
        h,
      ),
      h.div(
        [h.Class('flex justify-end')],
        [
          Button.view(
            {
              onClick: WorkHistory.Entry.ClickedRemoveSelf(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'text-sm text-gray-400 hover:text-red-500 transition cursor-pointer',
                    ),
                  ],
                  ['Remove position'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
})
