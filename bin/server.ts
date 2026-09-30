/*
|--------------------------------------------------------------------------
| HTTP server entrypoint
|--------------------------------------------------------------------------
|
| The "server.ts" file is the entrypoint for starting the AdonisJS HTTP
| server. Either you can run this file directly or use the "serve"
| command to run this file and monitor file changes
|
*/

import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'

/**
 * URL to the application root. AdonisJS need it to resolve
 * paths to file and directories for scaffolding commands
 */
const APP_ROOT = new URL('../', import.meta.url)

/**
 * The importer is used to import files in context of the
 * application.
 */
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.booting(async () => {
      await import('#start/env')
    })
    app.booted(async () => {
      const { default: env } = await import('#start/env')

      if (!env.get('REMINDER_WORKER_ENABLED')) {
        return
      }

      const { default: ReminderService } = await import('#services/reminder_service')
      await ReminderService.start()
    })
    app.terminating(async () => {
      /**
       * Deliberately not gated on REMINDER_WORKER_ENABLED. That flag only
       * decides whether the worker is started at BOOT; ReminderService.start()
       * is also reached lazily when a request enqueues a reminder, so a process
       * booted with the worker disabled can still be holding a live pg-boss
       * instance by the time it is asked to shut down. Gating the shutdown on
       * the flag left exactly that instance to be torn down by process exit
       * instead of stopped cleanly. stop() is a no-op when there is nothing
       * running.
       */
      const { default: ReminderService } = await import('#services/reminder_service')
      await ReminderService.stop()
    })
    app.listen('SIGTERM', () => app.terminate())
    app.listenIf(app.managedByPm2, 'SIGINT', () => app.terminate())
  })
  .httpServer()
  .start()
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
