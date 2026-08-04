import { Array, Option, pipe } from 'effect'
import { Calendar } from 'foldkit'
import { Valid, Validating } from 'foldkit/fieldValidation'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { FileDrop, Menu, Tabs } from '@foldkit/ui'

import { SubmitApplication } from './command'
import {
  ClickedNext,
  ClickedPrevious,
  ClickedSubmit,
  FailedSubmitApplication,
  GotAttachmentsMessage,
  GotCoverLetterMessage,
  GotEducationMessage,
  GotPersonalInfoMessage,
  GotSkillsMessage,
  GotStepMenuMessage,
  GotStepTabsMessage,
  GotWorkHistoryMessage,
  NavigatedToStep,
  SucceededSubmitApplication,
  ToggledPreview,
} from './message'
import { type Model, NotSubmitted, Submitting } from './model'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'
import { update } from './update'

const today = Calendar.make(2026, 4, 16)

const initialModel: Model = {
  currentStep: 'PersonalInfo',
  personalInfo: PersonalInfo.init(today),
  workHistory: WorkHistory.init(today, 'work-history-entry-1'),
  education: Education.init(today, 'education-entry-1'),
  skills: Skills.init('skills-entry-1'),
  coverLetter: CoverLetter.init(),
  attachments: Attachments.init(),
  isPreviewVisible: false,
  submission: NotSubmitted(),
  stepMenu: Menu.init({ id: 'step-menu' }),
  stepTabs: Tabs.init({ id: 'step-tabs' }),
  isSubmitAttempted: false,
}

const completeModel: Model = {
  ...initialModel,
  personalInfo: {
    ...initialModel.personalInfo,
    firstName: Valid({ value: 'Jane' }),
    lastName: Valid({ value: 'Doe' }),
    email: Valid({ value: 'jane@example.com' }),
  },
  workHistory: {
    ...initialModel.workHistory,
    entries: initialModel.workHistory.entries.map(entry => ({
      ...entry,
      company: Valid({ value: 'Foldkit' }),
      title: Valid({ value: 'Engineer' }),
    })),
  },
  education: {
    ...initialModel.education,
    entries: initialModel.education.entries.map(entry => ({
      ...entry,
      school: Valid({ value: 'MIT' }),
      degree: Valid({ value: 'BS' }),
      fieldOfStudy: Valid({ value: 'CS' }),
    })),
  },
  skills: {
    ...initialModel.skills,
    entries: initialModel.skills.entries.map(entry => ({
      ...entry,
      name: Valid({ value: 'TypeScript' }),
    })),
  },
}

const givenInitial = given(initialModel)

const resolveFocusTab = Command.resolve(Tabs.FocusTab, Tabs.CompletedFocusTab())

const resolveFocusMenuButton = Command.resolve(
  Menu.FocusButton,
  Menu.CompletedFocusButton(),
)

describe('update', () => {
  describe('navigation', () => {
    test('ClickedNext advances to the next step', () => {
      story(
        update,
        givenInitial,
        message(ClickedNext()),
        Command.expectNone(),
        model(model => {
          expect(model.currentStep).toBe('WorkHistory')
        }),
      )
    })

    test('ClickedPrevious goes back to the previous step', () => {
      story(
        update,
        given({ ...initialModel, currentStep: 'Education' }),
        message(ClickedPrevious()),
        model(model => {
          expect(model.currentStep).toBe('WorkHistory')
        }),
      )
    })

    test('ClickedPrevious on the first step stays put', () => {
      story(
        update,
        givenInitial,
        message(ClickedPrevious()),
        model(model => {
          expect(model.currentStep).toBe('PersonalInfo')
        }),
      )
    })

    test('ClickedNext on the last step stays put', () => {
      story(
        update,
        given({ ...initialModel, currentStep: 'Review' }),
        message(ClickedNext()),
        model(model => {
          expect(model.currentStep).toBe('Review')
        }),
      )
    })

    test('NavigatedToStep jumps directly to a step', () => {
      story(
        update,
        givenInitial,
        message(NavigatedToStep({ step: 'Skills' })),
        model(model => {
          expect(model.currentStep).toBe('Skills')
        }),
      )
    })

    test('GotStepTabsMessage selects the matching step', () => {
      story(
        update,
        givenInitial,
        message(
          GotStepTabsMessage({
            message: Tabs.SelectedTab({ index: 6, value: 'Review' }),
          }),
        ),
        model(model => {
          expect(model.currentStep).toBe('Review')
        }),
        resolveFocusTab,
      )
    })

    test('GotStepMenuMessage selects the matching step', () => {
      story(
        update,
        givenInitial,
        message(
          GotStepMenuMessage({
            message: Menu.Opened({ maybeActiveItemIndex: Option.none() }),
          }),
        ),
        Command.resolve(Menu.FocusItems, Menu.CompletedFocusItems()),
        message(
          GotStepMenuMessage({
            message: Menu.SelectedItem({ index: 5, item: 'Attachments' }),
          }),
        ),
        model(model => {
          expect(model.currentStep).toBe('Attachments')
        }),
        resolveFocusMenuButton,
      )
    })
  })

  describe('preview toggle', () => {
    test('ToggledPreview flips visibility', () => {
      story(
        update,
        givenInitial,
        message(ToggledPreview()),
        model(model => {
          expect(model.isPreviewVisible).toBe(true)
        }),
        message(ToggledPreview()),
        model(model => {
          expect(model.isPreviewVisible).toBe(false)
        }),
      )
    })
  })

  describe('personal info delegation', () => {
    test('first name update is delegated to personal info step', () => {
      story(
        update,
        givenInitial,
        message(
          GotPersonalInfoMessage({
            message: PersonalInfo.UpdatedFirstName({ value: 'Jane' }),
          }),
        ),
        model(model => {
          expect(model.personalInfo.firstName.value).toBe('Jane')
          expect(model.personalInfo.firstName._tag).toBe('Valid')
        }),
      )
    })

    test('short first name produces validation error', () => {
      story(
        update,
        givenInitial,
        message(
          GotPersonalInfoMessage({
            message: PersonalInfo.UpdatedFirstName({ value: 'J' }),
          }),
        ),
        model(model => {
          expect(model.personalInfo.firstName._tag).toBe('Invalid')
        }),
      )
    })

    test('email triggers async validation after passing sync checks', () => {
      story(
        update,
        givenInitial,
        message(
          GotPersonalInfoMessage({
            message: PersonalInfo.UpdatedEmail({ value: 'jane@example.com' }),
          }),
        ),
        Command.expectHas(PersonalInfo.ValidateEmailAsync),
        Command.resolve(
          PersonalInfo.ValidateEmailAsync,
          PersonalInfo.CompletedValidateEmailAsync({
            validationId: 1,
            field: Valid({ value: 'jane@example.com' }),
          }),
        ),
        model(model => {
          expect(model.personalInfo.email._tag).toBe('Valid')
        }),
      )
    })

    test('malformed email fails sync validation without async command', () => {
      story(
        update,
        givenInitial,
        message(
          GotPersonalInfoMessage({
            message: PersonalInfo.UpdatedEmail({ value: 'not-email' }),
          }),
        ),
        Command.expectNone(),
        model(model => {
          expect(model.personalInfo.email._tag).toBe('Invalid')
        }),
      )
    })

    test('stale email async result is discarded', () => {
      const modelWithInFlightValidation: Model = {
        ...initialModel,
        personalInfo: {
          ...initialModel.personalInfo,
          email: Validating({ value: 'jane@example.com' }),
          emailValidationId: 5,
        },
      }

      story(
        update,
        given(modelWithInFlightValidation),
        message(
          GotPersonalInfoMessage({
            message: PersonalInfo.CompletedValidateEmailAsync({
              validationId: 3,
              field: Valid({ value: 'old@example.com' }),
            }),
          }),
        ),
        model(model => {
          expect(model.personalInfo.email._tag).toBe('Validating')
          expect(model.personalInfo.email.value).toBe('jane@example.com')
          expect(model.personalInfo.emailValidationId).toBe(5)
        }),
      )
    })
  })

  describe('work history delegation', () => {
    test('adds a new work entry', () => {
      story(
        update,
        givenInitial,
        message(
          GotWorkHistoryMessage({
            message: WorkHistory.SucceededGenerateEntryId({
              entryId: 'test-work-1',
            }),
          }),
        ),
        model(model => {
          expect(model.workHistory.entries.length).toBe(2)
        }),
      )
    })

    test('keeps work history unchanged when entry ID generation fails', () => {
      story(
        update,
        givenInitial,
        message(
          GotWorkHistoryMessage({
            message: WorkHistory.FailedGenerateEntryId(),
          }),
        ),
        Command.expectNone(),
        model(model => {
          expect(model.workHistory).toEqual(initialModel.workHistory)
        }),
      )
    })

    test('removes a work entry', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.workHistory.entries),
      )

      story(
        update,
        givenInitial,
        message(
          GotWorkHistoryMessage({
            message: WorkHistory.RemovedEntry({ entryId: firstEntry.id }),
          }),
        ),
        model(model => {
          expect(model.workHistory.entries.length).toBe(0)
        }),
      )
    })

    test('updates company in a work entry', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.workHistory.entries),
      )

      story(
        update,
        givenInitial,
        message(
          GotWorkHistoryMessage({
            message: WorkHistory.GotEntryMessage({
              entryId: firstEntry.id,
              message: WorkHistory.Entry.UpdatedCompany({
                value: 'Foldkit Inc.',
              }),
            }),
          }),
        ),
        model(model => {
          expect(
            pipe(
              model.workHistory.entries,
              Array.head,
              Option.map(entry => entry.company.value),
              Option.getOrThrow,
            ),
          ).toBe('Foldkit Inc.')
        }),
      )
    })
  })

  describe('education delegation', () => {
    test('adds a new education entry', () => {
      story(
        update,
        givenInitial,
        message(
          GotEducationMessage({
            message: Education.SucceededGenerateEntryId({
              entryId: 'test-edu-1',
            }),
          }),
        ),
        model(model => {
          expect(model.education.entries.length).toBe(2)
        }),
      )
    })

    test('keeps education unchanged when entry ID generation fails', () => {
      story(
        update,
        givenInitial,
        message(
          GotEducationMessage({
            message: Education.FailedGenerateEntryId(),
          }),
        ),
        Command.expectNone(),
        model(model => {
          expect(model.education).toEqual(initialModel.education)
        }),
      )
    })

    test('removes an education entry', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.education.entries),
      )

      story(
        update,
        givenInitial,
        message(
          GotEducationMessage({
            message: Education.RemovedEntry({ entryId: firstEntry.id }),
          }),
        ),
        model(model => {
          expect(model.education.entries.length).toBe(0)
        }),
      )
    })

    test('updates school in an education entry', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.education.entries),
      )

      story(
        update,
        givenInitial,
        message(
          GotEducationMessage({
            message: Education.GotEntryMessage({
              entryId: firstEntry.id,
              message: Education.Entry.UpdatedSchool({ value: 'MIT' }),
            }),
          }),
        ),
        model(model => {
          expect(
            pipe(
              model.education.entries,
              Array.head,
              Option.map(entry => entry.school.value),
              Option.getOrThrow,
            ),
          ).toBe('MIT')
        }),
      )
    })

    test('empty school is Invalid with required message', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.education.entries),
      )

      story(
        update,
        givenInitial,
        message(
          GotEducationMessage({
            message: Education.GotEntryMessage({
              entryId: firstEntry.id,
              message: Education.Entry.UpdatedSchool({ value: 'MIT' }),
            }),
          }),
        ),
        message(
          GotEducationMessage({
            message: Education.GotEntryMessage({
              entryId: firstEntry.id,
              message: Education.Entry.UpdatedSchool({ value: '' }),
            }),
          }),
        ),
        model(model => {
          expect(
            pipe(
              model.education.entries,
              Array.head,
              Option.map(entry => entry.school._tag),
              Option.getOrThrow,
            ),
          ).toBe('Invalid')
        }),
      )
    })
  })

  describe('skills delegation', () => {
    test('adds a new skill entry', () => {
      story(
        update,
        givenInitial,
        message(
          GotSkillsMessage({
            message: Skills.SucceededGenerateEntryId({
              entryId: 'test-skill-1',
            }),
          }),
        ),
        model(model => {
          expect(model.skills.entries.length).toBe(2)
        }),
      )
    })

    test('keeps skills unchanged when entry ID generation fails', () => {
      story(
        update,
        givenInitial,
        message(
          GotSkillsMessage({
            message: Skills.FailedGenerateEntryId(),
          }),
        ),
        Command.expectNone(),
        model(model => {
          expect(model.skills).toEqual(initialModel.skills)
        }),
      )
    })

    test('updates skill name', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.skills.entries),
      )

      story(
        update,
        givenInitial,
        message(
          GotSkillsMessage({
            message: Skills.GotEntryMessage({
              entryId: firstEntry.id,
              message: Skills.Entry.UpdatedName({
                value: 'TypeScript',
              }),
            }),
          }),
        ),
        model(model => {
          expect(
            pipe(
              model.skills.entries,
              Array.head,
              Option.map(entry => entry.name.value),
              Option.getOrThrow,
            ),
          ).toBe('TypeScript')
        }),
      )
    })
  })

  describe('cover letter delegation', () => {
    test('updates content', () => {
      story(
        update,
        givenInitial,
        message(
          GotCoverLetterMessage({
            message: CoverLetter.UpdatedContent({
              value: 'I love the Elm Architecture.',
            }),
          }),
        ),
        model(model => {
          expect(model.coverLetter.content).toBe('I love the Elm Architecture.')
        }),
      )
    })
  })

  describe('attachments delegation', () => {
    test('stores a dropped resume as the maybeResume File', () => {
      const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
        type: 'application/pdf',
      })
      story(
        update,
        givenInitial,
        message(
          GotAttachmentsMessage({
            message: Attachments.GotResumeDropMessage({
              message: FileDrop.DroppedFiles({ files: [resume] }),
            }),
          }),
        ),
        model(model => {
          expect(model.attachments.maybeResume._tag).toBe('Some')
        }),
      )
    })

    test('appends dropped additional files to the list', () => {
      const file = new globalThis.File(['content'], 'portfolio.pdf', {
        type: 'application/pdf',
      })
      story(
        update,
        givenInitial,
        message(
          GotAttachmentsMessage({
            message: Attachments.GotAdditionalFilesDropMessage({
              message: FileDrop.DroppedFiles({ files: [file] }),
            }),
          }),
        ),
        model(model => {
          expect(model.attachments.additionalFiles).toHaveLength(1)
        }),
      )
    })
  })

  describe('submission', () => {
    test('ClickedSubmit on a complete application transitions to Submitting and fires command', () => {
      story(
        update,
        given({ ...completeModel, currentStep: 'Review' }),
        message(ClickedSubmit()),
        Command.expectExact(SubmitApplication),
        Command.resolve(SubmitApplication, SucceededSubmitApplication()),
        model(model => {
          expect(model.submission._tag).toBe('SubmitSuccess')
          expect(model.isSubmitAttempted).toBe(true)
        }),
      )
    })

    test('ClickedSubmit on an incomplete application reveals errors and does not submit', () => {
      story(
        update,
        given({ ...initialModel, currentStep: 'Review' }),
        message(ClickedSubmit()),
        Command.expectNone(),
        model(model => {
          expect(model.submission._tag).toBe('NotSubmitted')
          expect(model.isSubmitAttempted).toBe(true)
          expect(model.personalInfo.firstName._tag).toBe('Invalid')
          expect(model.personalInfo.lastName._tag).toBe('Invalid')
          expect(model.personalInfo.email._tag).toBe('Invalid')
          expect(
            pipe(
              model.workHistory.entries,
              Array.head,
              Option.map(entry => entry.company._tag),
              Option.getOrThrow,
            ),
          ).toBe('Invalid')
          expect(
            pipe(
              model.education.entries,
              Array.head,
              Option.map(entry => entry.school._tag),
              Option.getOrThrow,
            ),
          ).toBe('Invalid')
          expect(
            pipe(
              model.skills.entries,
              Array.head,
              Option.map(entry => entry.name._tag),
              Option.getOrThrow,
            ),
          ).toBe('Invalid')
        }),
      )
    })

    test('ClickedSubmit with pending validation does not submit', () => {
      story(
        update,
        given({
          ...completeModel,
          currentStep: 'Review',
          personalInfo: {
            ...completeModel.personalInfo,
            email: Validating({ value: 'jane@example.com' }),
          },
        }),
        message(ClickedSubmit()),
        Command.expectNone(),
        model(model => {
          expect(model.submission._tag).toBe('NotSubmitted')
          expect(model.isSubmitAttempted).toBe(true)
          expect(model.personalInfo.email._tag).toBe('Validating')
        }),
      )
    })

    test('ClickedSubmit preserves Valid fields rather than re-running validation', () => {
      story(
        update,
        given({ ...completeModel, currentStep: 'Review' }),
        message(ClickedSubmit()),
        Command.resolve(SubmitApplication, SucceededSubmitApplication()),
        model(model => {
          expect(model.personalInfo.firstName._tag).toBe('Valid')
          expect(model.personalInfo.firstName.value).toBe('Jane')
        }),
      )
    })

    test('successful submission shows success', () => {
      story(
        update,
        given({
          ...initialModel,
          currentStep: 'Review',
          submission: Submitting(),
        }),
        message(SucceededSubmitApplication()),
        model(model => {
          expect(model.submission._tag).toBe('SubmitSuccess')
        }),
      )
    })

    test('failed submission shows error', () => {
      story(
        update,
        given({
          ...initialModel,
          currentStep: 'Review',
          submission: Submitting(),
        }),
        message(FailedSubmitApplication({ error: 'Server down' })),
        model(model => {
          expect(model.submission._tag).toBe('SubmitError')
        }),
      )
    })
  })
})
