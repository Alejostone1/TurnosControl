import { Queue, Worker } from 'bullmq'

// ─── Lazy singletons ─────────────────────────────────────────
// Nothing is instantiated at module load time.
// Redis and BullMQ connections are created on first use,
// which means they never run during `next build`.

let _queue: Queue | null = null
let _worker: Worker | null = null
let _workerStarted = false

function getRedisConfig() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    }
  } catch {
    return { host: 'localhost', port: 6379 }
  }
}

function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue('payroll-calculation', {
      connection: getRedisConfig(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    })
  }
  return _queue
}

// Worker starts once, on the first job submission.
// It stays alive for the lifetime of the Node.js process (next start).
function ensureWorker(): void {
  if (_workerStarted) return
  _workerStarted = true

  _worker = new Worker(
    'payroll-calculation',
    async (job) => {
      const { periodoId, userId } = job.data
      try {
        const { CalculationService } = await import('@/services/calculation.service')
        await new CalculationService().calcularPeriodo(periodoId)

        const { prisma } = await import('@/lib/prisma')
        await prisma.periodoNomina.update({
          where: { id: periodoId },
          data: {
            estadoPeriodo: 'CALCULADO',
            calculadoEn: new Date(),
            calculadoPor: userId,
          },
        })
        return { success: true, periodoId }
      } catch (error) {
        const { prisma } = await import('@/lib/prisma')
        await prisma.periodoNomina.update({
          where: { id: periodoId },
          data: { estadoPeriodo: 'BORRADOR', calculadoEn: null, calculadoPor: null },
        })
        throw error
      }
    },
    { connection: getRedisConfig(), concurrency: 2 }
  )

  _worker.on('completed', (job) => {
    console.log(`Trabajo completado para período: ${job?.data?.periodoId}`)
  })
  _worker.on('failed', (job, err) => {
    console.error(`Trabajo fallido para período ${job?.data?.periodoId}:`, err)
  })
  _worker.on('error', (err) => {
    console.error('Error en worker de nómina:', err)
  })

  const shutdown = async () => {
    await _worker?.close()
    await _queue?.close()
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

// ─── Public API ──────────────────────────────────────────────

export async function addPayrollCalculationJob(
  periodoId: string,
  empresaId: string,
  userId: string
) {
  ensureWorker()
  return getQueue().add(
    'calculate-payroll',
    { periodoId, empresaId, userId },
    { priority: 1, delay: 0, removeOnComplete: 100, removeOnFail: 50 }
  )
}

export async function getJobStatus(jobId: string) {
  const job = await getQueue().getJob(jobId)
  if (!job) return { status: 'not_found' }
  const state = await job.getState()
  return {
    status: state,
    progress: job.progress,
    data: job.data,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
  }
}

export async function getQueueStats() {
  const q = getQueue()
  const [waiting, active, completed, failed] = await Promise.all([
    q.getWaiting(),
    q.getActive(),
    q.getCompleted(),
    q.getFailed(),
  ])
  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
  }
}

export async function cleanCompletedJobs() {
  await getQueue().clean(0, 0, 'completed')
}

export async function cleanFailedJobs() {
  await getQueue().clean(0, 0, 'failed')
}
