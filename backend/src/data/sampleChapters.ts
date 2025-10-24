import { Chapter } from '../models/database';

/**
 * Sample curriculum data for Mathematics Grade 8
 * This demonstrates the chapter structure
 */

export const SAMPLE_CHAPTERS: Chapter[] = [
  {
    chapterId: 'algebra-intro',
    subject: 'Mathematics',
    grade: '8',
    title: 'Introduction to Algebra',
    order: 1,
    content: {
      concepts: [
        {
          id: 'variables',
          title: 'Variables and Constants',
          explanation:
            'In algebra, we use letters (called variables) to represent unknown numbers. Constants are fixed values that don\'t change.',
          keyPoints: [
            'Variables are symbols (usually letters) that represent unknown values',
            'Constants are numbers that have fixed values',
            'We use variables to write general rules and solve problems',
            'Common variables include x, y, z, a, b, c',
          ],
        },
        {
          id: 'expressions',
          title: 'Algebraic Expressions',
          explanation:
            'An algebraic expression is a mathematical phrase that can contain numbers, variables, and operation symbols.',
          keyPoints: [
            'Expressions don\'t have an equals sign',
            'Terms are parts of an expression separated by + or -',
            'Coefficients are numbers multiplied by variables',
            'Like terms have the same variable with the same exponent',
          ],
        },
      ],
      examples: [
        {
          id: 'ex1',
          problem: 'Identify the variables, constants, and coefficients in: 3x + 5y - 7',
          solution: 'Variables: x, y; Constants: -7; Coefficients: 3 (for x), 5 (for y)',
          steps: [
            'Look for letters that represent unknown values → x and y are variables',
            'Find numbers that stand alone → -7 is a constant',
            'Identify numbers multiplied by variables → 3 and 5 are coefficients',
          ],
          difficulty: 'easy',
        },
        {
          id: 'ex2',
          problem: 'Simplify the expression: 2x + 3x + 5',
          solution: '5x + 5',
          steps: [
            'Identify like terms: 2x and 3x are like terms',
            'Combine like terms: 2x + 3x = 5x',
            'Keep the constant: +5 remains',
            'Final answer: 5x + 5',
          ],
          difficulty: 'easy',
        },
      ],
      practiceProblems: [
        {
          id: 'p1',
          problem: 'Simplify: 4y + 2y - y',
          hint: 'Combine all the y terms together',
          solution: '5y',
          difficulty: 'easy',
        },
        {
          id: 'p2',
          problem: 'Simplify: 3a + 2b + 5a - b',
          hint: 'Combine like terms separately (a terms together, b terms together)',
          solution: '8a + b',
          difficulty: 'medium',
        },
      ],
      keywords: [
        'variable',
        'constant',
        'expression',
        'coefficient',
        'term',
        'like terms',
        'simplify',
        'algebra',
        'algebraic',
      ],
    },
    metadata: {
      difficulty: 'beginner',
      prerequisites: [],
      estimatedMinutes: 30,
      learningObjectives: [
        'Understand the difference between variables and constants',
        'Identify parts of an algebraic expression',
        'Combine like terms to simplify expressions',
      ],
    },
    cacheKey: 'chapter_algebra-intro_v1',
    tokenCount: 850, // Approximate
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    chapterId: 'linear-equations',
    subject: 'Mathematics',
    grade: '8',
    title: 'Solving Linear Equations',
    order: 2,
    content: {
      concepts: [
        {
          id: 'equations',
          title: 'Understanding Equations',
          explanation:
            'An equation is a mathematical statement that two expressions are equal. Solving an equation means finding the value of the variable that makes the equation true.',
          keyPoints: [
            'Equations have an equals sign (=)',
            'The goal is to isolate the variable on one side',
            'What you do to one side, you must do to the other',
            'Check your answer by substituting back into the original equation',
          ],
        },
        {
          id: 'one-step',
          title: 'One-Step Equations',
          explanation:
            'One-step equations can be solved using a single operation. Use inverse operations to isolate the variable.',
          keyPoints: [
            'Addition and subtraction are inverse operations',
            'Multiplication and division are inverse operations',
            'Apply the inverse operation to both sides',
          ],
        },
      ],
      examples: [
        {
          id: 'ex1',
          problem: 'Solve: x + 5 = 12',
          solution: 'x = 7',
          steps: [
            'We need to isolate x',
            'Subtract 5 from both sides: x + 5 - 5 = 12 - 5',
            'Simplify: x = 7',
            'Check: 7 + 5 = 12 ✓',
          ],
          difficulty: 'easy',
        },
        {
          id: 'ex2',
          problem: 'Solve: 3x = 15',
          solution: 'x = 5',
          steps: [
            'We need to isolate x',
            'Divide both sides by 3: 3x/3 = 15/3',
            'Simplify: x = 5',
            'Check: 3(5) = 15 ✓',
          ],
          difficulty: 'easy',
        },
      ],
      practiceProblems: [
        {
          id: 'p1',
          problem: 'Solve: y - 8 = 3',
          hint: 'Add 8 to both sides',
          solution: 'y = 11',
          difficulty: 'easy',
        },
        {
          id: 'p2',
          problem: 'Solve: x/4 = 7',
          hint: 'Multiply both sides by 4',
          solution: 'x = 28',
          difficulty: 'easy',
        },
      ],
      keywords: [
        'equation',
        'solve',
        'linear',
        'inverse operation',
        'isolate',
        'variable',
        'solution',
        'balance',
        'one-step',
        'two-step',
      ],
    },
    metadata: {
      difficulty: 'beginner',
      prerequisites: ['algebra-intro'],
      estimatedMinutes: 45,
      learningObjectives: [
        'Understand what an equation represents',
        'Solve one-step linear equations',
        'Check solutions by substitution',
      ],
    },
    cacheKey: 'chapter_linear-equations_v1',
    tokenCount: 920,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    chapterId: 'geometry-basics',
    subject: 'Mathematics',
    grade: '8',
    title: 'Introduction to Geometry',
    order: 3,
    content: {
      concepts: [
        {
          id: 'points-lines',
          title: 'Points, Lines, and Planes',
          explanation:
            'Geometry studies shapes, sizes, and positions. We start with the most basic elements: points, lines, and planes.',
          keyPoints: [
            'A point is a location with no size',
            'A line extends infinitely in both directions',
            'A plane is a flat surface that extends infinitely',
            'Collinear points lie on the same line',
          ],
        },
      ],
      examples: [
        {
          id: 'ex1',
          problem: 'Name three collinear points in a diagram',
          solution: 'Any three points that lie on the same line',
          steps: ['Identify a line in the diagram', 'Find three points on that line', 'Name the points'],
          difficulty: 'easy',
        },
      ],
      practiceProblems: [
        {
          id: 'p1',
          problem: 'Draw a line segment connecting points A and B',
          hint: 'A line segment has two endpoints',
          solution: 'A straight line from A to B',
          difficulty: 'easy',
        },
      ],
      keywords: [
        'geometry',
        'point',
        'line',
        'plane',
        'collinear',
        'segment',
        'ray',
        'angle',
      ],
    },
    metadata: {
      difficulty: 'beginner',
      prerequisites: [],
      estimatedMinutes: 40,
      learningObjectives: [
        'Identify basic geometric elements',
        'Understand points, lines, and planes',
      ],
    },
    cacheKey: 'chapter_geometry-basics_v1',
    tokenCount: 720,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
