// English texts of the API, picked with "lang": "en". Same keys as ru.js.

export default {
  locale: 'en-US',
  plural: (value, forms) => (Math.abs(value) === 1 ? forms.one : forms.many),

  score: {
    empty: 'Empty',
    very_weak: 'Very weak',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    excellent: 'Excellent'
  },

  time: {
    beyond: 'Practically impossible to brute-force',
    instant: 'Instantly',
    underSecond: 'Less than a second',
    and: ' and ',
    units: {
      year: { one: 'year', many: 'years' },
      day: { one: 'day', many: 'days' },
      hour: { one: 'hour', many: 'hours' },
      minute: { one: 'minute', many: 'minutes' },
      second: { one: 'second', many: 'seconds' }
    }
  },

  weaknesses: {
    empty: 'Enter at least one character.',
    too_short: 'Fewer than 8 characters — a password like this is easy to brute-force.',
    short: 'Make it 12+ characters long for a noticeable gain in strength.',
    repeated: 'Repeated characters add no strength.',
    few_unique: 'Too few different characters.',
    common_pattern: 'The password contains a common pattern found in breached databases.',
    sequence: 'Character sequences are guessed instantly.',
    keyboard: 'Simple keyboard walks are easy to recognise.',
    date: 'Birth years and dates are common in passwords.',
    low_entropy: 'Low entropy — mix different kinds of characters.',
    no_letters: 'Add letters to widen the range of possibilities.',
    no_digits: 'Digits make brute-forcing harder and add strength.',
    no_symbols: 'Special characters raise entropy if they are easy for you to remember.'
  },

  strengths: {
    very_long: 'A very long password keeps a safety margin for years.',
    long: '12+ characters raise the strength sharply.',
    mixed_case: 'Mixed case makes guessing harder.',
    letters_digits: 'Letters combined with digits give more combinations.',
    symbols: 'Special characters add entropy.',
    unicode: 'Unicode characters widen the alphabet, if the service accepts them.',
    high_entropy: 'High entropy — the password resists brute force.'
  },

  tips: {
    add_word: 'Add one more word to make it longer.',
    add_upper: 'Add a capital letter.',
    add_digits: 'Add a couple of digits.',
    add_symbol: 'Add a special character for more entropy.',
    use_phrase: 'The password contains a known pattern. Try a phrase:'
  },

  words: ['Summit', 'Beacon', 'Cedar', 'Sunrise', 'Breeze', 'Anchor', 'Sail', 'Comet'],

  errors: {
    not_string: 'The password must be a string.',
    too_long: 'The password is too long. 128 characters at most.',
    internal: 'Something went wrong. Please try again later.',
    breach_unavailable: 'The breach check is temporarily unavailable.',
    too_large: 'The request is too large.',
    bad_json: 'Malformed JSON.',
    rate_limited: 'Too many requests. Try again in a minute.'
  }
};
