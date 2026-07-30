import { Calendar } from 'foldkit'
import { Valid, Validating } from 'foldkit/fieldValidation'
import {
  Command,
  click,
  expect,
  given,
  inside,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Menu, Tabs } from '@foldkit/ui'

import {
  type Model,
  NotSubmitted,
  SubmitError,
  SubmitSuccess,
  Submitting,
} from './model'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'
import { update } from './update'
import { view } from './view'

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

const resolveFocusTab = Command.resolve(Tabs.FocusTab, Tabs.CompletedFocusTab())

describe('view', () => {
  test('initial view shows the page heading and the PersonalInfo step', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(role('heading', { name: 'Apply to Work on Foldkit' })).toExist(),
      expect(role('heading', { name: 'Personal Info' })).toExist(),
      expect(role('button', { name: 'Next →' })).toExist(),
    )
  })

  test('the step nav lists every step', () => {
    scene(
      { update, view },
      given(initialModel),
      inside(
        role('tablist', { name: 'Application steps' }),
        expect(text('Personal Info')).toExist(),
        expect(text('Work History')).toExist(),
        expect(text('Education')).toExist(),
        expect(text('Skills')).toExist(),
        expect(text('Cover Letter')).toExist(),
        expect(text('Attachments')).toExist(),
        expect(text('Review')).toExist(),
      ),
    )
  })

  test('tabs can jump directly to any step', () => {
    scene(
      { update, view },
      given(initialModel),
      inside(
        role('tablist', { name: 'Application steps' }),
        click(role('tab', { name: /Review$/ })),
      ),
      resolveFocusTab,
      expect(role('heading', { name: 'Review' })).toExist(),
    )
  })

  test('clicking Next advances to the Work History step', () => {
    scene(
      { update, view },
      given(initialModel),
      click(role('button', { name: 'Next →' })),
      expect(role('heading', { name: 'Work History' })).toExist(),
      expect(role('button', { name: '← Previous' })).toExist(),
    )
  })

  test('Previous on a later step returns to the prior step', () => {
    scene(
      { update, view },
      given({ ...initialModel, currentStep: 'Education' }),
      expect(role('heading', { name: 'Education' })).toExist(),
      click(role('button', { name: '← Previous' })),
      expect(role('heading', { name: 'Work History' })).toExist(),
    )
  })

  test('the first step does not render a Previous button', () => {
    scene(
      { update, view },
      given(initialModel),
      expect(role('button', { name: '← Previous' })).toBeAbsent(),
    )
  })

  test('the Review step exposes a Submit button and hides Next', () => {
    scene(
      { update, view },
      given({ ...initialModel, currentStep: 'Review' }),
      expect(role('button', { name: 'Submit Application' })).toExist(),
      expect(role('button', { name: 'Next →' })).toBeAbsent(),
    )
  })

  test('clicking Submit on an incomplete application shows a blocking notice', () => {
    scene(
      { update, view },
      given({ ...initialModel, currentStep: 'Review' }),
      expect(role('button', { name: 'Submit Application' })).toBeEnabled(),
      expect(
        text(
          'Review Personal Info, Work History, Education, Skills before submitting.',
        ),
      ).not.toExist(),
      click(role('button', { name: 'Submit Application' })),
      expect(
        text(
          'Review Personal Info, Work History, Education, Skills before submitting.',
        ),
      ).toExist(),
    )
  })

  test('a pending validation notice names the incomplete step', () => {
    scene(
      { update, view },
      given({
        ...completeModel,
        currentStep: 'Review',
        personalInfo: {
          ...completeModel.personalInfo,
          email: Validating({ value: 'jane@example.com' }),
        },
      }),
      expect(role('button', { name: 'Submit Application' })).toBeEnabled(),
      click(role('button', { name: 'Submit Application' })),
      expect(text('Review Personal Info before submitting.')).toExist(),
    )
  })

  test('submit blocking notices include multiple incomplete required steps', () => {
    scene(
      { update, view },
      given({
        ...completeModel,
        currentStep: 'Review',
        workHistory: {
          ...completeModel.workHistory,
          entries: [],
        },
        education: {
          ...completeModel.education,
          entries: [],
        },
        skills: {
          ...completeModel.skills,
          entries: [],
        },
      }),
      expect(role('button', { name: 'Submit Application' })).toBeEnabled(),
      click(role('button', { name: 'Submit Application' })),
      expect(
        text('Review Work History, Education, Skills before submitting.'),
      ).toExist(),
    )
  })

  test('a submitting application shows a Submitting button', () => {
    scene(
      { update, view },
      given({
        ...initialModel,
        currentStep: 'Review',
        submission: Submitting(),
      }),
      expect(role('button', { name: 'Submitting...' })).toExist(),
    )
  })

  test('a successful submission swaps the form for a success panel', () => {
    scene(
      { update, view },
      given({
        ...initialModel,
        currentStep: 'Review',
        submission: SubmitSuccess(),
      }),
      expect(text('Application Submitted', { exact: false })).toExist(),
    )
  })

  test('a failed submission shows the error and a Try Again control', () => {
    scene(
      { update, view },
      given({
        ...initialModel,
        currentStep: 'Review',
        submission: SubmitError({ error: 'Network down' }),
      }),
      expect(text('Network down')).toExist(),
      expect(role('button', { name: 'Try Again' })).toExist(),
    )
  })
})
