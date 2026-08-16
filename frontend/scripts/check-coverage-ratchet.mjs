#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import process from 'node:process';

const [, , summaryPath = 'coverage/coverage-summary.json', baselinePath = 'coverage-baseline.json'] = process.argv;

const TOLERANCE_PCT = 0.3;
const RAISE_FOR_IMPROVEMENT_PCT = 1.0;

// Suelos absolutos recomendados para proyectos React/TypeScript con Testing Library.
// El baseline dinamico tambien debe mantenerse siempre por encima de estos valores.
const MINIMUM_LINE_PCT = 70;
const MINIMUM_BRANCH_PCT = 55;

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const roundOne = (value) => Math.round((value + Number.EPSILON) * 10) / 10;

const readCurrentCoverage = (summary) => ({
    line: Number(summary?.total?.lines?.pct),
    branch: Number(summary?.total?.branches?.pct),
});

const validateCoverage = (coverage, label) => {
    for (const metric of ['line', 'branch']) {
        if (!Number.isFinite(coverage[metric])) {
            throw new Error(`${label} coverage is missing a numeric ${metric} value.`);
        }
    }
};

const compareWithBaseline = (current, baseline) => {
    const currentRounded = {
        line: roundOne(current.line),
        branch: roundOne(current.branch),
    };
    const baselineRounded = {
        line: roundOne(baseline.line),
        branch: roundOne(baseline.branch),
    };

    for (const metric of ['line', 'branch']) {
        const delta = currentRounded[metric] - baselineRounded[metric];
        if (delta < -TOLERANCE_PCT) {
            return {
                status: 'fail',
                message: `Coverage regression detected for ${metric}: current ${currentRounded[metric].toFixed(1)}% is ${(baselineRounded[metric] - currentRounded[metric]).toFixed(1)} percentage points below baseline ${baselineRounded[metric].toFixed(1)}%.`,
            };
        }
        if (delta > RAISE_FOR_IMPROVEMENT_PCT) {
            return {
                status: 'fail',
                message: `Coverage improved for ${metric}: current ${currentRounded[metric].toFixed(1)}% exceeds baseline ${baselineRounded[metric].toFixed(1)}% by ${delta.toFixed(1)} points. Please update ${baselinePath} in this PR.`,
            };
        }
    }

    return {
        status: 'pass',
        message: 'Coverage is within the ratchet bounds.',
    };
};

const checkMinimumThresholds = (current) => {
    const failures = [];

    if (current.line < MINIMUM_LINE_PCT) {
        failures.push(`Line coverage ${current.line.toFixed(1)}% is below the minimum required threshold of ${MINIMUM_LINE_PCT}%.`);
    }
    if (current.branch < MINIMUM_BRANCH_PCT) {
        failures.push(`Branch coverage ${current.branch.toFixed(1)}% is below the minimum required threshold of ${MINIMUM_BRANCH_PCT}%.`);
    }

    return failures.length === 0
        ? { status: 'pass', message: 'Coverage meets the absolute minimum thresholds.' }
        : { status: 'fail', message: failures.join(' ') };
};

const main = async () => {
    const summary = await readJson(summaryPath);
    const baseline = await readJson(baselinePath);
    const current = readCurrentCoverage(summary);

    validateCoverage(current, 'Current');
    validateCoverage(baseline, 'Baseline');

    // Las dos validaciones se ejecutan siempre y se informan por separado.
    const ratchet = compareWithBaseline(current, baseline);
    const thresholds = checkMinimumThresholds(current);
    const overall = ratchet.status === 'pass' && thresholds.status === 'pass' ? 'pass' : 'fail';

    console.log(JSON.stringify({
        current,
        baseline,
        minimums: {
            line: MINIMUM_LINE_PCT,
            branch: MINIMUM_BRANCH_PCT,
        },
        result: {
            ratchet,
            thresholds,
            overall,
        },
    }, null, 2));

    process.exitCode = overall === 'pass' ? 0 : 1;
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
});
