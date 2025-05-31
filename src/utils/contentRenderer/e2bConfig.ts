
export interface E2BConfig {
  apiKey?: string;
  defaultLanguage: string;
  timeout: number;
  enableFileSystem: boolean;
  maxMemory: string;
  allowNetworking: boolean;
}

export const defaultE2BConfig: E2BConfig = {
  apiKey: import.meta.env.VITE_E2B_API_KEY || '',
  defaultLanguage: 'javascript',
  timeout: 30000, // 30 seconds
  enableFileSystem: true,
  maxMemory: '512MB',
  allowNetworking: false
};

export const supportedLanguages = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'csharp',
  'go',
  'rust',
  'php',
  'ruby',
  'bash'
] as const;

export type SupportedLanguage = typeof supportedLanguages[number];

export function detectLanguage(code: string): SupportedLanguage {
  // Simple language detection based on code patterns
  if (code.includes('import React') || code.includes('useState') || code.includes('jsx')) {
    return 'javascript';
  }
  if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) {
    return 'typescript';
  }
  if (code.includes('def ') || code.includes('import numpy') || code.includes('print(')) {
    return 'python';
  }
  if (code.includes('public class') || code.includes('System.out.println')) {
    return 'java';
  }
  if (code.includes('#include') || code.includes('std::')) {
    return 'cpp';
  }
  if (code.includes('using System') || code.includes('Console.WriteLine')) {
    return 'csharp';
  }
  if (code.includes('func ') || code.includes('package main')) {
    return 'go';
  }
  if (code.includes('fn ') || code.includes('println!')) {
    return 'rust';
  }
  if (code.includes('<?php') || code.includes('echo ')) {
    return 'php';
  }
  if (code.includes('def ') && code.includes('end')) {
    return 'ruby';
  }
  if (code.includes('#!/bin/bash') || code.includes('echo ')) {
    return 'bash';
  }
  
  return 'javascript'; // default fallback
}
