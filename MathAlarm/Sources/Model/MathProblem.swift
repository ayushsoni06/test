import Foundation

/// A single arithmetic question shown during the wake-up challenge.
struct MathProblem: Identifiable, Equatable, Sendable {
    let id = UUID()
    let question: String
    let answer: Int

    static func make(for difficulty: Difficulty) -> MathProblem {
        switch difficulty {
        case .easy: easyProblem()
        case .medium: mediumProblem()
        case .hard: hardProblem()
        }
    }

    static func series(for difficulty: Difficulty) -> [MathProblem] {
        (0..<difficulty.problemCount).map { _ in make(for: difficulty) }
    }

    private static func easyProblem() -> MathProblem {
        let a = Int.random(in: 12...89)
        let b = Int.random(in: 12...89)
        if Bool.random() {
            return MathProblem(question: "\(a) + \(b)", answer: a + b)
        }
        let high = max(a, b), low = min(a, b)
        return MathProblem(question: "\(high) − \(low)", answer: high - low)
    }

    private static func mediumProblem() -> MathProblem {
        switch Int.random(in: 0...2) {
        case 0:
            let a = Int.random(in: 12...29)
            let b = Int.random(in: 3...9)
            return MathProblem(question: "\(a) × \(b)", answer: a * b)
        case 1:
            let a = Int.random(in: 120...899)
            let b = Int.random(in: 120...899)
            return MathProblem(question: "\(a) + \(b)", answer: a + b)
        default:
            let a = Int.random(in: 200...900)
            let b = Int.random(in: 20...199)
            return MathProblem(question: "\(a) − \(b)", answer: a - b)
        }
    }

    private static func hardProblem() -> MathProblem {
        switch Int.random(in: 0...2) {
        case 0:
            let a = Int.random(in: 13...39)
            let b = Int.random(in: 12...29)
            return MathProblem(question: "\(a) × \(b)", answer: a * b)
        case 1:
            // Multiply then add, so it cannot be done in one glance.
            let a = Int.random(in: 7...19)
            let b = Int.random(in: 6...12)
            let c = Int.random(in: 24...99)
            return MathProblem(question: "\(a) × \(b) + \(c)", answer: a * b + c)
        default:
            // Exact division, built from a known product.
            let b = Int.random(in: 4...12)
            let result = Int.random(in: 11...40)
            return MathProblem(question: "\(b * result) ÷ \(b)", answer: result)
        }
    }
}
