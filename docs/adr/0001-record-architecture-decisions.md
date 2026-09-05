# 1. Record architecture decisions

Date: 2026-09-05

## Status

Accepted.

## Context

The game is about to grow past the campaign it was written for. Decisions taken now, like whether the combat rules are allowed to know the word "Dacia", will constrain every era added after. Reading them back out of a diff a year from now is guesswork.

## Decision

Architecture decisions that constrain future work get a numbered file in `docs/adr/`, in the format Michael Nygard describes: context, the decision, the consequences we accepted along with it.

An ADR is warranted when a choice is hard to reverse, when it rules out an approach someone would otherwise reach for, or when the reasoning is not obvious from the code. Ordinary implementation choices do not get one.

## Consequences

A short file per decision, written when the decision is made rather than reconstructed later. ADRs are not edited once accepted; a decision that changes gets a new ADR that supersedes the old one, and the old one stays where it is.
