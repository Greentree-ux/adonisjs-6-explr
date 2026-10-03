import { assert } from '@japa/assert'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [assert(), pluginAdonisJS(app)]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [
    /**
     * Stop the pg-boss reminder worker, or the suite passes and then hangs
     * forever instead of exiting.
     *
     * Nothing here starts the worker on purpose. ReminderService.start() is
     * reached lazily from the enqueue path, so any test that schedules a
     * reminder leaves a supervised pg-boss instance holding a database
     * connection, and "forceExit: false" in adonisrc.ts means Japa waits for
     * the event loop to drain. The worker's own startup log arrives AFTER the
     * results summary, which is what makes this confusing to diagnose: the run
     * reports "PASSED" and then sits there.
     *
     * stop() is a no-op when no worker was started.
     */
    async () => {
      const { default: ReminderService } = await import('#services/reminder_service')
      await ReminderService.stop()
    },
  ],
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(() => testUtils.httpServer().start())
  }
}
